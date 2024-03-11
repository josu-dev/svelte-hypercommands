export class HyperPaletteError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HyperPaletteError';
    }
}

export class DuplicatedIdError extends HyperPaletteError {
    readonly id: string | undefined;

    constructor(message: string, id: string | undefined = undefined) {
        super(message);
        this.name = 'DuplicatedIdError';
        this.id = id;
    }
}
