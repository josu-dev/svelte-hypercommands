import { writable } from "svelte/store";


export class Searcher<T>{

  constructor(data: T[], mapper: (item: T) => string) {
  }

  add(item: T):void{
  }

  remove(filterFn:((item:T,idx:number)=>boolean)):void{
  }

  search(search: string):{item:T, idx:number}[]{
    return [];
  }
}

export type SearchableItem<T extends Record<PropertyKey, any>> = {
  item: T;
  searchTerms: string;
};

export type ItemToSearchTerms<T extends Record<PropertyKey, any>> = (item: T) => string;

export function generateSearchableItems<T, S extends SearchableItem<T> = SearchableItem<T>>(data: T[], mapper: ItemToSearchTerms<T>) {
  const result: S[] = [];
  for (const item of data) {
    result.push({
      item: item,
      searchTerms: mapper(item).toLowerCase().replace(/\s/g, ""),
    } as S);
  }
  return result;
}

export function filterItems<T, S extends SearchableItem<T> = SearchableItem<T>>(data: S[], search: string) {
  const searchTerm = search.toLowerCase().replace(/\s/g, "") || "";
  if (searchTerm === "") {
    if (emptySearchAll) {
      return data;
    }
    return [];
  }

  return data.filter((item) => item.searchTerms.includes(searchTerm));
}

export const createSearchStore = <T extends Record<PropertyKey, any>, >(
  data: T[],
  options: SearchStoreOptions<T>,
) => {
  const startFull = options.startMode === "full";
  const dataUpdateFull = options.dataUpdateState === "full";
  const emptySearchAll = options.emptySearchMode === "all";
  const mapper = options.mapper;

  

  const dataSearchable = generateSearchableItems(data);

  const { subscribe, set, update } = writable<SearchStoreModel<T, S>>({
    data: dataSearchable,
    filtered: startFull ? [...dataSearchable] : [],
    search: "",
    original: data,
    originalFiltered: startFull ? [...data] : [],
  });

  function updateData(data: T[]) {
    update((store) => {
      store.data = generateSearchableItems(data);
      store.filtered = dataUpdateFull ? [...store.data] : [];
      store.search = "";
      store.original = data;
      store.originalFiltered = dataUpdateFull ? [...data] : [];
      return store;
    });
  }

  function search(search: string) {
    update((store) => {
      store.search = search;
      store.filtered = filterItems(store.data, search);
      store.originalFiltered = store.filtered.map((item) => item.item);
      return store;
    });
  }

  return {
    subscribe,
    set,
    update,
    updateData,
    search,
  };
};

export const searchHandler = <T extends Record<PropertyKey, any>>(
  store: SearchStoreModel<T>,
) => {
  const searchTerm = store.search.toLowerCase() || "";
  store.filtered = store.data.filter((item) => {
    return item.searchTerms.toLowerCase().includes(searchTerm);
  });
};
