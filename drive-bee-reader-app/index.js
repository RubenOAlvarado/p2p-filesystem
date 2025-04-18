import Hyperswarm from 'hyperswarm'
import Corestore from 'corestore'
import Hyperbee from 'hyperbee'
import b4a from 'b4a'

const key = process.argv[2];
if(!key) throw new Error('Usage: node index.js <key>');

const store = new Corestore('./data');
const swarm = new Hyperswarm();

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function shutdown(){
    console.log('shutting down...');
    try {
        await swarm.destroy();
        await store.close();
        console.log('Shutdown complete.');
        process.exit(1);
    } catch (error) {
        console.error(`Error during shutdown: ${error}`);
        process.exit(0);
    }
}

swarm.on('connection', conn => store.replicate(conn));
const core = store.get({key: b4a.from(key, 'hex')});

const bee = new Hyperbee(core, {keyEncoding: 'utf-8', valueEncoding: 'utf-8'});
await core.ready();

const foundPeers = store.findingPeers();
swarm.join(core.discoveryKey);
swarm.flush().then(() => foundPeers());

core.on('append', listBee);

listBee();

async function listBee(){
  console.log('\n***************')
  console.log('hyperbee contents are now:')
  for await (const node of bee.createReadStream()) {
    console.log('  ', node.key, '->', node.value)
  }
}