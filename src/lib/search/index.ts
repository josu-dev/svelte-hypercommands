import type { OneOrMany } from '$lib/utils/index.js';

export type SearchableItem<T extends Record<PropertyKey, any>> = {
    item: T;
    AID: number;
    searchableText: string;
};

export type AnyRecord = Record<PropertyKey, any>;

export type ItemToSearchableText<T extends AnyRecord> = (item: T) => string;

/**
 * Translates a string into a representation that can be used for searching.
 *
 * This function will:
 * - Convert the string to lower case.
 * - Normalize the string using the Unicode Normalization Form D (NFD), which will decompose characters into their ASCII equivalents.
 * - Remove all characters that are not in the range of 0x21 to 0x7E (`!` to `~`), which are the most desirable characters for searching.
 *
 * @param text The text to translate.
 * @returns The source text translated to characters in the range of 0x21 to 0x7E (`!` to `~`).
 */
function translateToSafeASCII(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^\x21-\x7E]/g, '');
}

export function generateSearchableItems<
    T extends AnyRecord,
    S extends SearchableItem<T> = SearchableItem<T>,
>(mapper: ItemToSearchableText<T>, data: T[], offset: number = 0) {
    const result: S[] = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        result.push({
            item,
            AID: offset + i,
            searchableText: translateToSafeASCII(mapper(item)),
        } as S);
    }

    return result;
}

export const emptySearchMode = {
    all: 'all',
    none: 'none',
} as const;

export type EmptySearchMode = (typeof emptySearchMode)[keyof typeof emptySearchMode];

export const itemsUpdateMode = {
    filter: 'filter',
    none: 'none',
} as const;

export type ItemsUpdateMode = (typeof itemsUpdateMode)[keyof typeof itemsUpdateMode];

export type SearcherOptions<T extends AnyRecord> = {
    mapper: ItemToSearchableText<T>;
    onEmptySearch?: EmptySearchMode;
    onItemsUpdate?: boolean;
};

export type ItemSelector<T extends AnyRecord> = (item: T, AID: number) => boolean;

export class Searcher<
    TSource extends AnyRecord,
    T extends SearchableItem<TSource> = SearchableItem<TSource>,
> {
    static #AID = 0;

    #items: T[];
    #itemsFiltered: T[];
    #query: string;
    #sourceItems: TSource[];
    #sourceItemsFiltered: TSource[];
    #sourceQuery: string;
    #mapper: ItemToSearchableText<TSource>;
    #filterOnUpdate: boolean;
    #emptySearchMode: EmptySearchMode;

    constructor({
        mapper,
        onItemsUpdate: searchOnUpdate,
        onEmptySearch: onEmptyQuery,
    }: SearcherOptions<TSource>) {
        this.#items = [];
        this.#itemsFiltered = [];
        this.#query = '';
        this.#sourceItems = [];
        this.#sourceItemsFiltered = [];
        this.#sourceQuery = '';
        this.#mapper = mapper;
        this.#filterOnUpdate = searchOnUpdate ?? true;
        this.#emptySearchMode = onEmptyQuery ?? emptySearchMode.all;
    }

    add(item: OneOrMany<TSource>): void {
        const items = Array.isArray(item) ? item : [item];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            this.#sourceItems.push(item);
            this.#items.push({
                item,
                AID: Searcher.#AID++,
                searchableText: translateToSafeASCII(this.#mapper(item)),
            } as T);
        }

        if (this.#filterOnUpdate) {
            this.search(this.#query);
        }
    }

    remove(selector: ItemSelector<TSource>): TSource[] {
        const removedItems: TSource[] = [];
        for (let i = this.#items.length - 1; i >= 0; i--) {
            const item = this.#items[i];
            if (selector(item.item, item.AID)) {
                this.#items.splice(i, 1);
                this.#sourceItems.splice(i, 1);
                removedItems.push(item.item);
            }
        }

        if (this.#filterOnUpdate) {
            this.search(this.#query);
        }
        return removedItems;
    }

    search(query: string): TSource[] {
        this.#sourceQuery = query;
        const searchText = translateToSafeASCII(query);
        this.#query = searchText;

        this.#itemsFiltered.length = 0;
        this.#sourceItemsFiltered.length = 0;

        if (searchText === '') {
            if (this.#emptySearchMode === emptySearchMode.none) {
                return [];
            }

            for (let i = 0; i < this.#items.length; i++) {
                const item = this.#items[i];
                this.#itemsFiltered.push(item);
                this.#sourceItemsFiltered.push(item.item);
            }

            return [...this.#sourceItems];
        }

        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            let searchIndex = 0;
            for (let charIndex = 0; charIndex < item.searchableText.length; charIndex++) {
                if (item.searchableText[charIndex] === searchText[searchIndex]) {
                    searchIndex++;
                    if (searchIndex === searchText.length) {
                        this.#itemsFiltered.push(item);
                        this.#sourceItemsFiltered.push(item.item);
                        break;
                    }
                }
            }
        }

        return [...this.#sourceItemsFiltered];
    }

    sideEffectFreeSearch(query: string): TSource[] {
        const searchText = translateToSafeASCII(query);
        const filteredItems: T[] = [];
        const filteredSourceItems: TSource[] = [];

        if (searchText === '') {
            if (this.#emptySearchMode === emptySearchMode.none) {
                return [];
            }

            for (let i = 0; i < this.#items.length; i++) {
                const item = this.#items[i];
                filteredItems.push(item);
                filteredSourceItems.push(item.item);
            }

            return filteredSourceItems;
        }

        for (let i = 0; i < this.#items.length; i++) {
            const item = this.#items[i];
            let searchIndex = 0;
            for (let charIndex = 0; charIndex < item.searchableText.length; charIndex++) {
                if (item.searchableText[charIndex] === searchText[searchIndex]) {
                    searchIndex++;
                    if (searchIndex === searchText.length) {
                        filteredItems.push(item);
                        filteredSourceItems.push(item.item);
                        break;
                    }
                }
            }
        }

        return filteredSourceItems;
    }

    reset({
        mapper,
        onItemsUpdate: searchOnUpdate,
        onEmptySearch: onEmptyQuery,
    }: Partial<SearcherOptions<TSource>>): void {
        this.#items.length = 0;
        this.#itemsFiltered.length = 0;
        this.#query = '';
        this.#sourceItems.length = 0;
        this.#sourceItemsFiltered.length = 0;
        this.#sourceQuery = '';
        this.#mapper = mapper ?? this.#mapper;
        this.#filterOnUpdate = searchOnUpdate ?? this.#filterOnUpdate;
        this.#emptySearchMode = onEmptyQuery ?? this.#emptySearchMode;
    }

    sortItems(comparator: (a: T, b: T) => number): void {
        this.#items.sort(comparator);
        this.#sourceItems.length = 0;
        for (let i = 0; i < this.#items.length; i++) {
            this.#sourceItems.push(this.#items[i].item);
        }

        if (this.#filterOnUpdate) {
            this.search(this.#query);
        }
    }
}
