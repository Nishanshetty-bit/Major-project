import { randomUUID } from "node:crypto";
import { calculateProfile } from "./behavior.service.js";

const responsesBySession = new Map();

function storageKey(query) {
  return query.userId ? `user:${query.userId}` : `session:${query.sessionId || "guest"}`;
}

export function rememberBehaviorResponse(record) {
  const key = storageKey(record);
  const responses = responsesBySession.get(key) || [];
  const response = { ...record, _id: randomUUID(), createdAt: new Date(), updatedAt: new Date() };
  responses.push(response);
  responsesBySession.set(key, responses);
  return response;
}

export function getRememberedBehaviorProfile(query) {
  return calculateProfile(responsesBySession.get(storageKey(query)) || []);
}

export function getRememberedBehaviorHistory(query, limit = 100) {
  return [...(responsesBySession.get(storageKey(query)) || [])]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
