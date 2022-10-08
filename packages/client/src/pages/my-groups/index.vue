<template>
	<MkStickyContainer>
		<template #header><MkPageHeader :actions="headerActions"/></template>
		<MkSpacer :content-max="800" :margin-min="20">
			<MkButton primary style="margin: 0 auto var(--margin) auto;" @click="create"><i class="fas fa-plus"></i> {{ i18n.ts.createGroup }}</MkButton>
			<MkPagination v-slot="{items}" ref="owned" :pagination="ownedPagination">
				<div v-for="group in items" :key="group.id" class="_card">
					<div class="_title"><MkA :to="`/my/groups/${ group.id }`" class="_link">{{ group.name }}</MkA></div>
					<div class="_content">
						<MkAvatars :user-ids="group.userIds"/>
					</div>
				</div>
			</MkPagination>
			<MkPagination v-slot="{items}" ref="joined" :pagination="joinedPagination">
				<div v-for="group in items" :key="group.id" class="_card">
					<div class="_title">{{ group.name }}</div>
					<div class="_content">
						<MkAvatars :user-ids="group.userIds"/>
					</div>
					<div class="_footer">
						<MkButton danger @click="leave(group)">{{ i18n.ts.leaveGroup }}</MkButton>
					</div>
				</div>
			</MkPagination>
		</MkSpacer>
	</MkStickyContainer>
	</template>
	
	<script lang="ts" setup>
	import { computed, ref } from 'vue';
	import MkPagination from '@/components/MkPagination.vue';
	import MkButton from '@/components/MkButton.vue';
	import MkAvatars from '@/components/MkAvatars.vue';
	import * as os from '@/os';
	import { definePageMetadata } from "@/scripts/page-metadata";
	import { i18n } from '@/i18n';
	import MkStickyContainer from '@/components/global/MkStickyContainer.vue';
	
	const owned = ref('owned');
	const joined = ref('joined');
	
	const ownedPagination = {
		endpoint: 'users/groups/owned' as const,
		limit: 10,
	};
	
	const joinedPagination = {
		endpoint: 'users/groups/joined' as const,
		limit: 10,
	};
	
	const headerActions = $computed(() => [
		{
			icon: 'fas fa-plus',
			text: i18n.ts.createGroup,
			handler: create,
		},
	]);
	
	definePageMetadata(
		computed(() => ({
			title: i18n.ts.groups,
			icon: "fas fa-users",
		})),
	);
	
	async function create() {
		const { canceled, result: name } = await os.inputText({
			title: i18n.ts.groupName,
		});
		if (canceled) return;
		await os.api('users/groups/create', { name: name });
		owned.value.reload();
		os.success();
	}
	
	async function leave(group) {
		const { canceled } = await os.confirm({
			type: 'warning',
			text: i18n.t('leaveGroupConfirm', { name: group.name }),
		});
		if (canceled) return;
		os.apiWithDialog('users/groups/leave', {
			groupId: group.id,
		}).then(() => {
			joined.value.reload();
		});
	}
	</script>
	
	<style lang="scss" scoped>
	._card {
		margin-bottom: 1rem;
		._title {
			font-size: 1.2rem;
			font-weight: bold;
		}
		._content {
			margin: 1rem 0;
		}
		._footer {
			display: flex;
			justify-content: flex-end;
		}
	}
	</style>
<!-- <template>
<MkSpacer :content-max="700">
	<div v-if="tab === 'owned'" class="_content">
		<MkButton primary style="margin: 0 auto var(--margin) auto;" @click="create"><i class="fas fa-plus"></i> {{ $ts.createGroup }}</MkButton>

		<MkPagination v-slot="{items}" ref="owned" :pagination="ownedPagination">
			<div v-for="group in items" :key="group.id" class="_card">
				<div class="_title"><MkA :to="`/my/groups/${ group.id }`" class="_link">{{ group.name }}</MkA></div>
				<div class="_content"><MkAvatars :user-ids="group.userIds"/></div>
			</div>
		</MkPagination>
	</div>

	<div v-else-if="tab === 'joined'" class="_content">
		<MkPagination v-slot="{items}" ref="joined" :pagination="joinedPagination">
			<div v-for="group in items" :key="group.id" class="_card">
				<div class="_title">{{ group.name }}</div>
				<div class="_content"><MkAvatars :user-ids="group.userIds"/></div>
				<div class="_footer">
					<MkButton danger @click="leave(group)">{{ $ts.leaveGroup }}</MkButton>
				</div>
			</div>
		</MkPagination>
	</div>

	<div v-else-if="tab === 'invites'" class="_content">
		<MkPagination v-slot="{items}" ref="invitations" :pagination="invitationPagination">
			<div v-for="invitation in items" :key="invitation.id" class="_card">
				<div class="_title">{{ invitation.group.name }}</div>
				<div class="_content"><MkAvatars :user-ids="invitation.group.userIds"/></div>
				<div class="_footer">
					<MkButton primary inline @click="acceptInvite(invitation)"><i class="fas fa-check"></i> {{ $ts.accept }}</MkButton>
					<MkButton primary inline @click="rejectInvite(invitation)"><i class="fas fa-ban"></i> {{ $ts.reject }}</MkButton>
				</div>
			</div>
		</MkPagination>
	</div>
</MkSpacer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import MkPagination from '@/components/ui/pagination.vue';
import MkButton from '@/components/ui/button.vue';
import MkContainer from '@/components/ui/container.vue';
import MkAvatars from '@/components/avatars.vue';
import MkTab from '@/components/tab.vue';
import * as os from '@/os';
import * as symbols from '@/symbols';

export default defineComponent({
	components: {
		MkPagination,
		MkButton,
		MkContainer,
		MkTab,
		MkAvatars,
	},

	data() {
		return {
			[symbols.PAGE_INFO]: computed(() => ({
				title: this.$ts.groups,
				icon: 'fas fa-users',
				bg: 'var(--bg)',
				actions: [{
					icon: 'fas fa-plus',
					text: this.$ts.createGroup,
					handler: this.create,
				}],
				tabs: [{
					active: this.tab === 'owned',
					title: this.$ts.ownedGroups,
					icon: 'fas fa-user-tie',
					onClick: () => { this.tab = 'owned'; },
				}, {
					active: this.tab === 'joined',
					title: this.$ts.joinedGroups,
					icon: 'fas fa-id-badge',
					onClick: () => { this.tab = 'joined'; },
				}, {
					active: this.tab === 'invites',
					title: this.$ts.invites,
					icon: 'fas fa-envelope-open-text',
					onClick: () => { this.tab = 'invites'; },
				},]
			})),
			tab: 'owned',
			ownedPagination: {
				endpoint: 'users/groups/owned' as const,
				limit: 10,
			},
			joinedPagination: {
				endpoint: 'users/groups/joined' as const,
				limit: 10,
			},
			invitationPagination: {
				endpoint: 'i/user-group-invites' as const,
				limit: 10,
			},
		};
	},

	methods: {
		async create() {
			const { canceled, result: name } = await os.inputText({
				title: this.$ts.groupName,
			});
			if (canceled) return;
			await os.api('users/groups/create', { name: name });
			this.$refs.owned.reload();
			os.success();
		},
		acceptInvite(invitation) {
			os.api('users/groups/invitations/accept', {
				invitationId: invitation.id
			}).then(() => {
				os.success();
				this.$refs.invitations.reload();
				this.$refs.joined.reload();
			});
		},
		rejectInvite(invitation) {
			os.api('users/groups/invitations/reject', {
				invitationId: invitation.id
			}).then(() => {
				this.$refs.invitations.reload();
			});
		},
		async leave(group) {
			const { canceled } = await os.confirm({
				type: 'warning',
				text: this.$t('leaveGroupConfirm', { name: group.name }),
			});
			if (canceled) return;
			os.apiWithDialog('users/groups/leave', {
				groupId: group.id,
			}).then(() => {
				this.$refs.joined.reload();
			});
		}
	}
});
</script>

<style lang="scss" scoped>
</style> -->
