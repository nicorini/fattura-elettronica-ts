# Runs the test handler of worker.mjs, with check.mjs bundled with the tarball's code in smoke.js
# and the official example, all next to this file:
#
#   workerd test workerd.capnp
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [(name = "smoke", worker = .smoke)],
);

const smoke :Workerd.Worker = (
  modules = [
    (name = "worker.mjs", esModule = embed "worker.mjs"),
    (name = "smoke.js", esModule = embed "smoke.js"),
    (name = "example.xml", data = embed "IT01234567890_FPR01.xml"),
  ],
  compatibilityDate = "2026-11-01",
);
