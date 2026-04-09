import { EventEmitter } from "events";

const emitter = new EventEmitter();

emitter.on("user:registered", (user) => {
  console.log(`[EVENT] user:registered — ${user.email}`);
});

emitter.on("user:verified", (user) => {
  console.log(`[EVENT] user:verified — ${user.email}`);
});

emitter.on("user:invited", (user) => {
  console.log(`[EVENT] user:invited — ${user.email}`);
});

emitter.on("user:deleted", (user) => {
  console.log(`[EVENT] user:deleted — ${user.email}`);
});

export default emitter;
