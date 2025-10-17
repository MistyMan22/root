/**
 * Example usage of the graph database
 *
 * This file demonstrates how to:
 * 1. Define types in type-definitions.ts
 * 2. Sync types to database
 * 3. Create elements and links
 * 4. Query relationships
 */

import { graph } from "./index";

// Example: Create a user element
export async function createUserExample() {
  // First, make sure the 'user' type is defined in type-definitions.ts
  // Then run: pnpm db:graph:sync

  const user = await graph.element.create({
    typeId: "user",
    data: {
      name: "John Doe",
      email: "john@example.com",
      role: "admin", // This will use the default value from schema
    },
  });

  console.log("Created user:", user);
  return user;
}

// Example: Create a post element
export async function createPostExample() {
  const post = await graph.element.create({
    typeId: "post",
    data: {
      title: "My First Post",
      content: "This is the content of my first post.",
    },
  });

  console.log("Created post:", post);
  return post;
}

// Example: Create a link between user and post
export async function createLinkExample(userId: string, postId: string) {
  // First, make sure the 'authored' link type is defined in type-definitions.ts
  // Then run: pnpm db:graph:sync

  const link = await graph.link.create({
    fromId: userId,
    toId: postId,
    linkTypeId: "authored",
    data: {
      publishedAt: new Date(),
      status: "published",
    },
  });

  console.log("Created link:", link);
  return link;
}

// Example: Query all posts
export async function getAllPosts() {
  const posts = await graph.query.findByType("post");
  console.log("All posts:", posts);
  return posts;
}

// Example: Find posts by a specific user
export async function findPostsByUser(userId: string) {
  // Get all links from user to posts
  const links = await graph.link.findFrom(userId, "authored");

  // Get the actual posts
  const posts = await Promise.all(
    links.map((link) => graph.element.get(link.toId)),
  );

  const resolvedPosts = await Promise.all(posts);
  console.log("Posts by user:", resolvedPosts.filter(Boolean));
  return resolvedPosts.filter(Boolean);
}

// Example: Graph traversal
export async function traverseUserNetwork(userId: string) {
  // Find all users connected to this user (friends, followers, etc.)
  const network = await graph.query.traverse(userId, "follows", 2);
  console.log("User network:", network);
  return network;
}

// Example: Get connected elements
export async function getConnectedElements(elementId: string) {
  const connected = await graph.query.getConnectedElements(elementId);
  console.log("Connected elements:", connected);
  return connected;
}
