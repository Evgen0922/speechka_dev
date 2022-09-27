<template>
<div class="ipledcug">
	<div class="_fullinfo">
		<img src="http://speechka.22web.org/not-found.jpg" class="_ghost"/>
		<div>{{ i18n.ts.notFoundDescription }}</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n';
import { definePageMetadata } from '@/scripts/page-metadata';

const headerActions = $computed(() => []);

const headerTabs = $computed(() => []);

definePageMetadata({
	title: i18n.ts.notFound,
	icon: 'fas fa-exclamation-triangle',
});
</script>
