import type { ElementTypeId } from "./type-definitions";
import type { Element, Link } from "./types";
import { findElementsByType } from "./element";
import { findLinksFrom, findLinksTo } from "./link";

/**
 * Find elements by type (alias for findElementsByType)
 */
export async function findByType(typeId: ElementTypeId): Promise<Element[]> {
  return findElementsByType(typeId);
}

/**
 * Get all links from an element
 */
export async function getLinksFrom(
  elementId: string,
  linkTypeId?: string,
): Promise<Link[]> {
  return findLinksFrom(elementId, linkTypeId);
}

/**
 * Get all links to an element
 */
export async function getLinksTo(
  elementId: string,
  linkTypeId?: string,
): Promise<Link[]> {
  return findLinksTo(elementId, linkTypeId);
}

/**
 * Get all links connected to an element (both incoming and outgoing)
 */
export async function getAllLinks(
  elementId: string,
  linkTypeId?: string,
): Promise<Link[]> {
  const [fromLinks, toLinks] = await Promise.all([
    findLinksFrom(elementId, linkTypeId),
    findLinksTo(elementId, linkTypeId),
  ]);

  return [...fromLinks, ...toLinks];
}

/**
 * Get directly connected elements (one hop)
 */
export async function getConnectedElements(
  elementId: string,
  linkTypeId?: string,
): Promise<{ element: Element; link: Link; direction: "from" | "to" }[]> {
  const links = await getAllLinks(elementId, linkTypeId);
  const results: { element: Element; link: Link; direction: "from" | "to" }[] =
    [];

  for (const link of links) {
    const connectedElementId =
      link.fromId === elementId ? link.toId : link.fromId;
    const direction = link.fromId === elementId ? "to" : "from";

    // Get the connected element
    const { getElement } = await import("./element");
    const element = await getElement(connectedElementId);

    if (element) {
      results.push({ element, link, direction });
    }
  }

  return results;
}

/**
 * Simple graph traversal (BFS)
 */
export async function traverse(
  startElementId: string,
  linkTypeId?: string,
  maxDepth = 3,
): Promise<{ element: Element; depth: number; path: string[] }[]> {
  const visited = new Set<string>();
  const queue: { elementId: string; depth: number; path: string[] }[] = [
    { elementId: startElementId, depth: 0, path: [startElementId] },
  ];
  const results: { element: Element; depth: number; path: string[] }[] = [];

  while (queue.length > 0) {
    const shifted = queue.shift();
    if (!shifted) continue;
    const { elementId, depth, path } = shifted;

    if (visited.has(elementId) || depth > maxDepth) {
      continue;
    }

    visited.add(elementId);

    // Get the element
    const { getElement } = await import("./element");
    const element = await getElement(elementId);

    if (element) {
      results.push({ element, depth, path });

      // Add connected elements to queue
      if (depth < maxDepth) {
        const connected = await getConnectedElements(elementId, linkTypeId);

        for (const { element: connectedElement } of connected) {
          if (!visited.has(connectedElement.id)) {
            queue.push({
              elementId: connectedElement.id,
              depth: depth + 1,
              path: [...path, connectedElement.id],
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Find elements by type with pagination
 */
export async function findByTypePaginated(
  typeId: ElementTypeId,
  limit = 10,
  offset = 0,
): Promise<{ elements: Element[]; total: number }> {
  const elements = await findElementsByType(typeId);
  const total = elements.length;
  const paginated = elements.slice(offset, offset + limit);

  return { elements: paginated, total };
}
