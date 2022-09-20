/**
 * Client entry point
 */

import '@/style.scss';

//#region account indexedDB migration
import { set } from '@/scripts/idb-proxy';

if (localStorage.getItem('accounts') != null) {
	set('accounts', JSON.parse(localStorage.getItem('accounts')));
	localStorage.removeItem('accounts');
}
//#endregion

import { computed, createApp, watch, markRaw, version as vueVersion, defineAsyncComponent } from 'vue';
import { compareVersions } from 'compare-versions';
import JSON5 from 'json5';

import widgets from '@/widgets';
import directives from '@/directives';
import components from '@/components';
import { version, ui, lang, host } from '@/config';
import { applyTheme } from '@/scripts/theme';
import { isDeviceDarkmode } from '@/scripts/is-device-darkmode';
import { i18n } from '@/i18n';
import { confirm, alert, post, popup, toast } from '@/os';
import { stream } from '@/stream';
import * as sound from '@/scripts/sound';
import { $i, refreshAccount, login, updateAccount, signout } from '@/account';
import { defaultStore, ColdDeviceStorage } from '@/store';
import { fetchInstance, instance } from '@/instance';
import { makeHotkey } from '@/scripts/hotkey';
import { search } from '@/scripts/search';
import { deviceKind } from '@/scripts/device-kind';
import { initializeSw } from '@/scripts/initialize-sw';
import { reloadChannel } from '@/scripts/unison-reload';
import { reactionPicker } from '@/scripts/reaction-picker';
import { getUrlWithoutLoginId } from '@/scripts/login-id';
import { getAccountFromId } from '@/scripts/get-account-from-id';

(async () => {
	console.info(`Misskey v${version}`);

	if (_DEV_) {
		console.warn('Development mode!!!');

		console.info(`vue ${vueVersion}`);

		(window as any).$i = $i;
		(window as any).$store = defaultStore;

		window.addEventListener('error', event => {
			console.error(event);
			/*
			alert({
				type: 'error',
				title: 'DEV: Unhandled error',
				text: event.message
			});
			*/
		});

		window.addEventListener('unhandledrejection', event => {
			console.error(event);
			/*
			alert({
				type: 'error',
				title: 'DEV: Unhandled promise rejection',
				text: event.reason
			});
			*/
		});
	}

	
	document.addEventListener('touchend', () => {}, { passive: true });

	reloadChannel.addEventListener('message', path => {
		if (path !== null) location.href = path;
		else location.reload();
	});

	const vh = window.innerHeight * 0.01;
	document.documentElement.style.setProperty('--vh', `${vh}px`);
	window.addEventListener('resize', () => {
		const vh = window.innerHeight * 0.01;
		document.documentElement.style.setProperty('--vh', `${vh}px`);
	});
	
	if (['smartphone', 'tablet'].includes(deviceKind)) {
		const viewport = document.getElementsByName('viewport').item(0);
		viewport.setAttribute('content',
			`${viewport.getAttribute('content')}, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`);
	}

	
	const html = document.documentElement;
	html.setAttribute('lang', lang);

	const params = new URLSearchParams(location.search);
	const loginId = params.get('loginId');

	if (loginId) {
		const target = getUrlWithoutLoginId(location.href);

		if (!$i || $i.id !== loginId) {
			const account = await getAccountFromId(loginId);
			if (account) {
				await login(account.token, target);
			}
		}

		history.replaceState({ misskey: 'loginId' }, '', target);
	}

	if ($i && $i.token) {
		if (_DEV_) {
			console.log('account cache found. refreshing...');
		}

		refreshAccount();
	} else {
		if (_DEV_) {
			console.log('no account cache found.');
		}

		
		const i = (document.cookie.match(/igi=(\w+)/) || [null, null])[1];

		if (i != null && i !== 'null') {
			if (_DEV_) {
				console.log('signing...');
			}

			try {
				document.body.innerHTML = '<div>Please wait...</div>';
				await login(i);
			} catch (err) {
				
				document.body.innerHTML = '<div id="err">Oops!</div>';
			}
		} else {
			if (_DEV_) {
				console.log('not signed in');
			}
		}
	}

	const fetchInstanceMetaPromise = fetchInstance();

	fetchInstanceMetaPromise.then(() => {
		localStorage.setItem('v', instance.version);

	
		initializeSw();
	});

	const app = createApp(
		window.location.search === '?zen' ? defineAsyncComponent(() => import('@/ui/zen.vue')) :
		!$i ? defineAsyncComponent(() => import('@/ui/visitor.vue')) :
		ui === 'deck' ? defineAsyncComponent(() => import('@/ui/deck.vue')) :
		ui === 'classic' ? defineAsyncComponent(() => import('@/ui/classic.vue')) :
		defineAsyncComponent(() => import('@/ui/universal.vue')),
	);

	if (_DEV_) {
		app.config.performance = true;
	}

	app.config.globalProperties = {
		$i,
		$store: defaultStore,
		$instance: instance,
		$t: i18n.t,
		$ts: i18n.ts,
	};

	widgets(app);
	directives(app);
	components(app);

	const splash = document.getElementById('splash');
	if (splash) splash.addEventListener('transitionend', () => {
		splash.remove();
	});

	const rootEl = (() => {
		const MISSKEY_MOUNT_DIV_ID = 'misskey_app';

		const currentEl = document.getElementById(MISSKEY_MOUNT_DIV_ID);

		if (currentEl) {
			console.warn('multiple import detected');
			return currentEl;
		}

		const rootEl = document.createElement('div');
		rootEl.id = MISSKEY_MOUNT_DIV_ID;
		document.body.appendChild(rootEl);
		return rootEl;
	})();

	app.mount(rootEl);

	
	window.onerror = null;
	window.onunhandledrejection = null;

	reactionPicker.init();

	if (splash) {
		splash.style.opacity = '0';
		splash.style.pointerEvents = 'none';
	}

	
	const lastVersion = localStorage.getItem('lastVersion');
	if (lastVersion !== version) {
		localStorage.setItem('lastVersion', version);

		
		localStorage.removeItem('theme');

		try { 
			if (lastVersion != null && compareVersions(version, lastVersion) === 1) {
				
				if ($i) {
					popup(defineAsyncComponent(() => import('@/components/MkUpdated.vue')), {}, {}, 'closed');
				}
			}
		} catch (err) {
		}
	}

	
	watch(defaultStore.reactiveState.darkMode, (darkMode) => {
		applyTheme(darkMode ? ColdDeviceStorage.get('darkTheme') : ColdDeviceStorage.get('lightTheme'));
	}, { immediate: localStorage.theme == null });

	const darkTheme = computed(ColdDeviceStorage.makeGetterSetter('darkTheme'));
	const lightTheme = computed(ColdDeviceStorage.makeGetterSetter('lightTheme'));

	watch(darkTheme, (theme) => {
		if (defaultStore.state.darkMode) {
			applyTheme(theme);
		}
	});

	watch(lightTheme, (theme) => {
		if (!defaultStore.state.darkMode) {
			applyTheme(theme);
		}
	});

	
	if (ColdDeviceStorage.get('syncDeviceDarkMode')) {
		defaultStore.set('darkMode', isDeviceDarkmode());
	}

	window.matchMedia('(prefers-color-scheme: dark)').addListener(mql => {
		if (ColdDeviceStorage.get('syncDeviceDarkMode')) {
			defaultStore.set('darkMode', mql.matches);
		}
	});
	

	fetchInstanceMetaPromise.then(() => {
		if (defaultStore.state.themeInitial) {
			if (instance.defaultLightTheme != null) ColdDeviceStorage.set('lightTheme', JSON5.parse(instance.defaultLightTheme));
			if (instance.defaultDarkTheme != null) ColdDeviceStorage.set('darkTheme', JSON5.parse(instance.defaultDarkTheme));
			defaultStore.set('themeInitial', false);
		}
	});

	watch(defaultStore.reactiveState.useBlurEffectForModal, v => {
		document.documentElement.style.setProperty('--modalBgFilter', v ? 'blur(4px)' : 'none');
	}, { immediate: true });

	watch(defaultStore.reactiveState.useBlurEffect, v => {
		if (v) {
			document.documentElement.style.removeProperty('--blur');
		} else {
			document.documentElement.style.setProperty('--blur', 'none');
		}
	}, { immediate: true });

	let reloadDialogShowing = false;
	stream.on('_disconnected_', async () => {
		if (defaultStore.state.serverDisconnectedBehavior === 'reload') {
			location.reload();
		} else if (defaultStore.state.serverDisconnectedBehavior === 'dialog') {
			if (reloadDialogShowing) return;
			reloadDialogShowing = true;
			const { canceled } = await confirm({
				type: 'warning',
				title: i18n.ts.disconnectedFromServer,
				text: i18n.ts.reloadConfirm,
			});
			reloadDialogShowing = false;
			if (!canceled) {
				location.reload();
			}
		}
	});

	stream.on('emojiAdded', emojiData => {
		
	});

	for (const plugin of ColdDeviceStorage.get('plugins').filter(p => p.active)) {
		import('./plugin').then(({ install }) => {
			install(plugin);
		});
	}

	const hotkeys = {
		'd': (): void => {
			defaultStore.set('darkMode', !defaultStore.state.darkMode);
		},
		's': search,
	};

	if ($i) {
		
		hotkeys['p|n'] = post;

		if ($i.isDeleted) {
			alert({
				type: 'warning',
				text: i18n.ts.accountDeletionInProgress,
			});
		}

		const lastUsed = localStorage.getItem('lastUsed');
		if (lastUsed) {
			const lastUsedDate = parseInt(lastUsed, 10);
			
			if (Date.now() - lastUsedDate > 1000 * 60 * 60 * 2) {
				toast(i18n.t('welcomeBackWithName', {
					name: $i.name || $i.username,
				}));
			}
		}
		localStorage.setItem('lastUsed', Date.now().toString());

		if ('Notification' in window) {
			
			if (Notification.permission === 'default') {
				Notification.requestPermission();
			}
		}

		const main = markRaw(stream.useChannel('main', null, 'System'));

		
		main.on('meUpdated', i => {
			updateAccount(i);
		});

		main.on('readAllNotifications', () => {
			updateAccount({ hasUnreadNotification: false });
		});

		main.on('unreadNotification', () => {
			updateAccount({ hasUnreadNotification: true });
		});

		main.on('unreadMention', () => {
			updateAccount({ hasUnreadMentions: true });
		});

		main.on('readAllUnreadMentions', () => {
			updateAccount({ hasUnreadMentions: false });
		});

		main.on('unreadSpecifiedNote', () => {
			updateAccount({ hasUnreadSpecifiedNotes: true });
		});

		main.on('readAllUnreadSpecifiedNotes', () => {
			updateAccount({ hasUnreadSpecifiedNotes: false });
		});

		main.on('readAllMessagingMessages', () => {
			updateAccount({ hasUnreadMessagingMessage: false });
		});

		main.on('unreadMessagingMessage', () => {
			updateAccount({ hasUnreadMessagingMessage: true });
			sound.play('chatBg');
		});

		main.on('readAllAntennas', () => {
			updateAccount({ hasUnreadAntenna: false });
		});

		main.on('unreadAntenna', () => {
			updateAccount({ hasUnreadAntenna: true });
			sound.play('antenna');
		});

		main.on('readAllAnnouncements', () => {
			updateAccount({ hasUnreadAnnouncement: false });
		});

		main.on('readAllChannels', () => {
			updateAccount({ hasUnreadChannel: false });
		});

		main.on('unreadChannel', () => {
			updateAccount({ hasUnreadChannel: true });
			sound.play('channel');
		});

		
		main.on('myTokenRegenerated', () => {
			signout();
		});
	}

	
	document.addEventListener('keydown', makeHotkey(hotkeys));
})();
