// Internal imports for runtime bindings

// Main graph API
import type { ElementInputDataById, ElementTypeId } from "./type-definitions";
import type { ElementWithData } from "./types";
import {
  createElement as createElementFn,
  deleteElement as deleteElementFn,
  findElementsByType as findElementsByTypeFn,
  getElement as getElementFn,
  updateElement as updateElementFn,
} from "./element";
import {
  createElementType as createElementTypeFn,
  deleteElementType as deleteElementTypeFn,
  getElementType as getElementTypeFn,
  listElementTypes as listElementTypesFn,
  updateElementType as updateElementTypeFn,
} from "./element-type";
import {
  createLink as createLinkFn,
  deleteLink as deleteLinkFn,
  findLinksFrom as findLinksFromFn,
  findLinksTo as findLinksToFn,
  getLink as getLinkFn,
  updateLink as updateLinkFn,
} from "./link";
import {
  createLinkType as createLinkTypeFn,
  deleteLinkType as deleteLinkTypeFn,
  getLinkType as getLinkTypeFn,
  listLinkTypes as listLinkTypesFn,
  updateLinkType as updateLinkTypeFn,
} from "./link-type";
import {
  findByType as findByTypeFn,
  findByTypePaginated as findByTypePaginatedFn,
  getAllLinks as getAllLinksFn,
  getConnectedElements as getConnectedElementsFn,
  getLinksFrom as getLinksFromFn,
  getLinksTo as getLinksToFn,
  traverse as traverseFn,
} from "./query-helpers";

// Element operations
export {
  createElement,
  getElement,
  updateElement,
  deleteElement,
  findElementsByType,
} from "./element";

// Link operations
export {
  createLink,
  getLink,
  updateLink,
  deleteLink,
  findLinksFrom,
  findLinksTo,
} from "./link";

// Element type operations
export {
  createElementType,
  getElementType,
  updateElementType,
  deleteElementType,
  listElementTypes,
} from "./element-type";

// Link type operations
export {
  createLinkType,
  getLinkType,
  updateLinkType,
  deleteLinkType,
  listLinkTypes,
} from "./link-type";

// Query helpers
export {
  findByType,
  getLinksFrom,
  getLinksTo,
  getAllLinks,
  getConnectedElements,
  traverse,
  findByTypePaginated,
} from "./query-helpers";

// Types and utilities
export * from "./types";
export * from "./type-definitions";

type CreateElementFn = <K extends ElementTypeId>(params: {
  typeId: K;
  data: ElementInputDataById[K];
}) => Promise<ElementWithData<K>>;

type FindByTypeFn = <K extends ElementTypeId>(
  typeId: K,
) => Promise<ElementWithData<K>[]>;

export const graph = {
  element: {
    create: createElementFn as CreateElementFn,
    get: getElementFn,
    update: updateElementFn,
    delete: deleteElementFn,
    findByType: findElementsByTypeFn as FindByTypeFn,
  },
  link: {
    create: createLinkFn,
    get: getLinkFn,
    update: updateLinkFn,
    delete: deleteLinkFn,
    findFrom: findLinksFromFn,
    findTo: findLinksToFn,
  },
  elementType: {
    create: createElementTypeFn,
    get: getElementTypeFn,
    update: updateElementTypeFn,
    delete: deleteElementTypeFn,
    list: listElementTypesFn,
  },
  linkType: {
    create: createLinkTypeFn,
    get: getLinkTypeFn,
    update: updateLinkTypeFn,
    delete: deleteLinkTypeFn,
    list: listLinkTypesFn,
  },
  query: {
    findByType: findByTypeFn,
    getLinksFrom: getLinksFromFn,
    getLinksTo: getLinksToFn,
    getAllLinks: getAllLinksFn,
    getConnectedElements: getConnectedElementsFn,
    traverse: traverseFn,
    findByTypePaginated: findByTypePaginatedFn,
  },
};
