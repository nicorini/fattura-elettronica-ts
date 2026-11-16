// Smoke test of the published package on workerd, the runtime of Cloudflare Workers, which has no
// file system: the official example is a data module embedded by workerd.capnp.
import xml from 'example.xml';
import { smoke } from './smoke.js';

export default {
  test() {
    console.log(smoke(new Uint8Array(xml)));
  },
};
