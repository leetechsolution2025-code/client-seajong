const CDP = require('chrome-remote-interface');
const fs = require('fs');

async function main() {
    let client;
    try {
        client = await CDP({ port: 9229 });
        const { HeapProfiler } = client;
        await HeapProfiler.enable();
        
        const chunks = [];
        client.on('HeapProfiler.addHeapSnapshotChunk', (params) => {
            chunks.push(params.chunk);
        });

        console.log('Taking snapshot...');
        await HeapProfiler.takeHeapSnapshot({ reportProgress: false });
        
        fs.writeFileSync('heap.heapsnapshot', chunks.join(''));
        console.log('Snapshot written to heap.heapsnapshot');
    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}
main();
