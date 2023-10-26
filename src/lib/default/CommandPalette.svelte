<script context="module">
	import { createCommandPalette } from '$lib/command-palette/create';
	const state = createCommandPalette();

	export const elements = state.elements;
	export const states = state.states;
	export const methods = state.methods;
</script>

<script>
	import { onDestroy } from 'svelte';

	/**
	 * @type {import('$lib/command-palette/types').Command[]}
	 */
	export let commands = [];
	export let placeholder = 'Search for commands...';
	export let a11yInputLabel = 'Command Palette Search';

	const { commandPalette, label, input, form, result } = elements;
	const { results } = states;

	/** @type {() => void}*/
	let unregisterCommands;

	$: {
		unregisterCommands?.();
		unregisterCommands = methods.registerCommand(commands);
	}

	onDestroy(() => {
		unregisterCommands?.();
	});
</script>

<div {...$commandPalette} use:commandPalette class="palette-container">
	<form {...$form} use:form class="palette-search">
		<!-- svelte-ignore a11y-label-has-associated-control -->
		<label {...$label} use:label>{a11yInputLabel}</label>
		<input {...$input} use:input {placeholder} class="search-input" />
	</form>
	<div class="palette-results">
		{#each $results as command (command.id)}
			<div class="command" {...$result} use:result={command}>
				<div class="command-name">{command.name}</div>
				<div class="command-description">{command.description}</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.palette-container {
		display: flex;
		flex-direction: column;
		margin-top: 10vh;
		margin-inline: auto;
		width: 90vw;
		max-width: 640px;
		max-height: 80vh;
		pointer-events: auto;
		color: white;
		border-style: solid;
		border-width: 1px;
		border-color: rgb(113 113 122 / 0.25);
		border-radius: 0.25rem;
		background-color: rgb(24 24 27);
		overflow-y: hidden;
		font-size: 1rem;
	}
	@media (min-width: 640px) {
		.palette-container {
			margin-top: 10vh;
			width: 80vw;
		}
	}

	.palette-search {
		display: flex;
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}

	.search-input {
		width: 100%;
		padding-top: 0.25rem;
		padding-left: 0.5rem;
		padding-bottom: 0.25rem;
		padding-right: 0.5rem;
		border: none;
		border-radius: 0.125rem;
		font-size: 1rem /* 16px */;
		line-height: 1.5rem /* 24px */;
		font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
		--tw-ring-color: rgb(113 113 122 / 0.25);
		--tw-ring-offset-width: 1px;
		--tw-ring-inset: inset;
		--tw-ring-shadow: inset 0 0 0 1px var(--tw-ring-color);
		box-shadow: var(--tw-ring-shadow);
		background-color: rgb(49, 49, 49);
		color: rgb(228 228 231);
	}
	.search-input,
	.search-input:focus {
		outline: none;
	}
	.search-input:focus {
		--tw-ring-color: rgb(0, 120, 212);
		--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width)
			var(--tw-ring-offset-color);
		--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width))
			var(--tw-ring-color);
	}

	.palette-results {
		margin-bottom: 0.75rem;
		overflow-y: auto;
	}
	@media (min-width: 640px) {
		.palette-results {
			max-height: 40vh;
		}
	}

	.command {
		display: flex;
		flex-direction: column;
		padding-top: 0.5rem;
		padding-right: 0.75rem;
		padding-bottom: 0.5rem;
		padding-left: 0.75rem;
		border-radius: 0.25rem;
		opacity: 0.75;
		cursor: pointer;
	}

	.command:hover {
		opacity: 1;
		background-color: rgb(8 51 68 / 0.4);
	}
	.command[data-selected] {
		opacity: 1;
		background-color: rgb(8 51 68 / 0.75);
	}

	.command-name {
		font-weight: 500;
		color: rgb(244 244 245);
		font-size: 1rem;
		line-height: 1.5rem;
	}

	.command-description {
		color: rgb(228 228 231);
		font-weight: 300;
		font-size: 0.875rem;
		line-height: 1.25rem;
	}
</style>
