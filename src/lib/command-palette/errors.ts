export class HyperCommandError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'HyperCommandError';
	}
}

export class DuplicatedIDError extends HyperCommandError {
	id: string | undefined;

	constructor(message: string, id: string | undefined = undefined) {
		super(message);
		this.name = 'DuplicatedIDError';
		this.id = id;
	}
}
