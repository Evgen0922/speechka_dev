import { In } from 'typeorm';
import * as mfm from 'mfm-js';
import { Note } from '@/models/entities/note.js';
import { User } from '@/models/entities/user.js';
import { Users, PollVotes, DriveFiles, NoteReactions, Followings, Polls, Channels } from '../index.js';
import { Packed } from '@/misc/schema.js';
import { nyaize } from '@/misc/nyaize.js';
import { awaitAll } from '@/prelude/await-all.js';
import { convertLegacyReaction, convertLegacyReactions, decodeReaction } from '@/misc/reaction-lib.js';
import { NoteReaction } from '@/models/entities/note-reaction.js';
import { aggregateNoteEmojis, populateEmojis, prefetchEmojis } from '@/misc/populate-emojis.js';
import { db } from '@/db/postgre.js';

async function hideNote(packedNote: Packed<'Note'>, meId: User['id'] | null) {
	
	let hide = false;

	
	if (packedNote.visibility === 'specified') {
		if (meId == null) {
			hide = true;
		} else if (meId === packedNote.userId) {
			hide = false;
		} else {
			
			const specified = packedNote.visibleUserIds!.some((id: any) => meId === id);

			if (specified) {
				hide = false;
			} else {
				hide = true;
			}
		}
	}

	if (packedNote.visibility === 'followers') {
		if (meId == null) {
			hide = true;
		} else if (meId === packedNote.userId) {
			hide = false;
		} else if (packedNote.reply && (meId === packedNote.reply.userId)) {
			
			hide = false;
		} else if (packedNote.mentions && packedNote.mentions.some(id => meId === id)) {
			
			hide = false;
		} else {
			
			const following = await Followings.findOneBy({
				followeeId: packedNote.userId,
				followerId: meId,
			});

			if (following == null) {
				hide = true;
			} else {
				hide = false;
			}
		}
	}

	if (hide) {
		packedNote.visibleUserIds = undefined;
		packedNote.fileIds = [];
		packedNote.files = [];
		packedNote.text = null;
		packedNote.poll = undefined;
		packedNote.cw = null;
		packedNote.isHidden = true;
	}
}

async function populatePoll(note: Note, meId: User['id'] | null) {
	const poll = await Polls.findOneByOrFail({ noteId: note.id });
	const choices = poll.choices.map(c => ({
		text: c,
		votes: poll.votes[poll.choices.indexOf(c)],
		isVoted: false,
	}));

	if (meId) {
		if (poll.multiple) {
			const votes = await PollVotes.findBy({
				userId: meId,
				noteId: note.id,
			});

			const myChoices = votes.map(v => v.choice);
			for (const myChoice of myChoices) {
				choices[myChoice].isVoted = true;
			}
		} else {
			const vote = await PollVotes.findOneBy({
				userId: meId,
				noteId: note.id,
			});

			if (vote) {
				choices[vote.choice].isVoted = true;
			}
		}
	}

	return {
		multiple: poll.multiple,
		expiresAt: poll.expiresAt,
		choices,
	};
}

async function populateMyReaction(note: Note, meId: User['id'], _hint_?: {
	myReactions: Map<Note['id'], NoteReaction | null>;
}) {
	if (_hint_?.myReactions) {
		const reaction = _hint_.myReactions.get(note.id);
		if (reaction) {
			return convertLegacyReaction(reaction.reaction);
		} else if (reaction === null) {
			return undefined;
		}
		
	}

	const reaction = await NoteReactions.findOneBy({
		userId: meId,
		noteId: note.id,
	});

	if (reaction) {
		return convertLegacyReaction(reaction.reaction);
	}

	return undefined;
}

export const NoteRepository = db.getRepository(Note).extend({
	async isVisibleForMe(note: Note, meId: User['id'] | null): Promise<boolean> {
		
		if (note.visibility === 'specified') {
			if (meId == null) {
				return false;
			} else if (meId === note.userId) {
				return true;
			} else {
				
				return note.visibleUserIds.some((id: any) => meId === id);
			}
		}

		
		if (note.visibility === 'followers') {
			if (meId == null) {
				return false;
			} else if (meId === note.userId) {
				return true;
			} else if (note.reply && (meId === note.reply.userId)) {
				
				return true;
			} else if (note.mentions && note.mentions.some(id => meId === id)) {
				
				return true;
			} else {
				
				const [following, user] = await Promise.all([
					Followings.count({
						where: {
							followeeId: note.userId,
							followerId: meId,
						},
						take: 1,
					}),
					Users.findOneByOrFail({ id: meId }),
				]);

				/* If we know the following, everyhting is fine.

				But if we do not know the following, it might be that both the
				author of the note and the author of the like are remote users,
				in which case we can never know the following. Instead we have
				to assume that the users are following each other.
				*/
				return following > 0 || (note.userHost != null && user.host != null);
			}
		}

		return true;
	},

	async pack(
		src: Note['id'] | Note,
		me?: { id: User['id'] } | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
			_hint_?: {
				myReactions: Map<Note['id'], NoteReaction | null>;
			};
		}
	): Promise<Packed<'Note'>> {
		const opts = Object.assign({
			detail: true,
			skipHide: false,
		}, options);

		const meId = me ? me.id : null;
		const note = typeof src === 'object' ? src : await this.findOneByOrFail({ id: src });
		const host = note.userHost;

		let text = note.text;

		if (note.name && (note.url ?? note.uri)) {
			text = `【${note.name}】\n${(note.text || '').trim()}\n\n${note.url ?? note.uri}`;
		}

		const channel = note.channelId
			? note.channel
				? note.channel
				: await Channels.findOneBy({ id: note.channelId })
			: null;

		const reactionEmojiNames = Object.keys(note.reactions).filter(x => x?.startsWith(':')).map(x => decodeReaction(x).reaction).map(x => x.replace(/:/g, ''));

		const packed: Packed<'Note'> = await awaitAll({
			id: note.id,
			createdAt: note.createdAt.toISOString(),
			userId: note.userId,
			user: Users.pack(note.user ?? note.userId, me, {
				detail: false,
			}),
			text: text,
			cw: note.cw,
			visibility: note.visibility,
			localOnly: note.localOnly || undefined,
			visibleUserIds: note.visibility === 'specified' ? note.visibleUserIds : undefined,
			renoteCount: note.renoteCount,
			repliesCount: note.repliesCount,
			reactions: convertLegacyReactions(note.reactions),
			tags: note.tags.length > 0 ? note.tags : undefined,
			emojis: populateEmojis(note.emojis.concat(reactionEmojiNames), host),
			fileIds: note.fileIds,
			files: DriveFiles.packMany(note.fileIds),
			replyId: note.replyId,
			renoteId: note.renoteId,
			channelId: note.channelId || undefined,
			channel: channel ? {
				id: channel.id,
				name: channel.name,
			} : undefined,
			mentions: note.mentions.length > 0 ? note.mentions : undefined,
			uri: note.uri || undefined,
			url: note.url || undefined,

			...(opts.detail ? {
				reply: note.replyId ? this.pack(note.reply || note.replyId, me, {
					detail: false,
					_hint_: options?._hint_,
				}) : undefined,

				renote: note.renoteId ? this.pack(note.renote || note.renoteId, me, {
					detail: true,
					_hint_: options?._hint_,
				}) : undefined,

				poll: note.hasPoll ? populatePoll(note, meId) : undefined,

				...(meId ? {
					myReaction: populateMyReaction(note, meId, options?._hint_),
				} : {}),
			} : {}),
		});

		if (packed.user.isCat && packed.text) {
			const tokens = packed.text ? mfm.parse(packed.text) : [];
			mfm.inspect(tokens, node => {
				if (node.type === 'text') {
					
					node.props.text = nyaize(node.props.text);
				}
			});
			packed.text = mfm.toString(tokens);
		}

		if (!opts.skipHide) {
			await hideNote(packed, meId);
		}

		return packed;
	},

	async packMany(
		notes: Note[],
		me?: { id: User['id'] } | null | undefined,
		options?: {
			detail?: boolean;
			skipHide?: boolean;
		}
	) {
		if (notes.length === 0) return [];

		const meId = me ? me.id : null;
		const myReactionsMap = new Map<Note['id'], NoteReaction | null>();
		if (meId) {
			const renoteIds = notes.filter(n => n.renoteId != null).map(n => n.renoteId!);
			const targets = [...notes.map(n => n.id), ...renoteIds];
			const myReactions = await NoteReactions.findBy({
				userId: meId,
				noteId: In(targets),
			});

			for (const target of targets) {
				myReactionsMap.set(target, myReactions.find(reaction => reaction.noteId === target) || null);
			}
		}

		await prefetchEmojis(aggregateNoteEmojis(notes));

		return await Promise.all(notes.map(n => this.pack(n, me, {
			...options,
			_hint_: {
				myReactions: myReactionsMap,
			},
		})));
	},
});
