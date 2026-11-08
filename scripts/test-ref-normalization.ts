import { normalizeStorageReference } from '../lib/flow-jobs';

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

console.log('Testando normalizeStorageReference...');

// 1. Caminho relativo padrão
const rel = normalizeStorageReference('/api/storage/ancora_cozinha_camila_v1.jpg');
assert(rel === '/api/storage/ancora_cozinha_camila_v1.jpg', `Relativo falhou: ${rel}`);

// 2. URL absoluta de produção
const absProd = normalizeStorageReference('https://darktube.fjt-solutions.com/api/storage/ancora_cozinha_camila_v1.jpg');
assert(absProd === '/api/storage/ancora_cozinha_camila_v1.jpg', `Absoluto prod falhou: ${absProd}`);

// 3. URL absoluta de localhost
const absLocal = normalizeStorageReference('http://localhost:3000/api/storage/ancora_cozinha_camila_v1.jpg');
assert(absLocal === '/api/storage/ancora_cozinha_camila_v1.jpg', `Absoluto local falhou: ${absLocal}`);

// 4. Undefined / null / vazio
assert(normalizeStorageReference(undefined) === null, 'Undefined deve ser null');
assert(normalizeStorageReference(null) === null, 'Null deve ser null');
assert(normalizeStorageReference('') === null, 'Vazio deve ser null');

// 5. URL externa / inválida deve lançar erro explícito
let threw = false;
try {
  normalizeStorageReference('https://external-site.com/avatar.jpg');
} catch (e: any) {
  threw = true;
  assert(e.message.includes('inválido ou não suportado'), 'Mensagem de erro deve ser clara');
}
assert(threw, 'URL externa deve falhar');

let threwInvalid = false;
try {
  normalizeStorageReference('/images/camila.png');
} catch (e: any) {
  threwInvalid = true;
  assert(e.message.includes('inválido ou não suportado'), 'Caminho fora de /api/storage deve falhar');
}
assert(threwInvalid, 'Caminho fora de storage deve falhar');

console.log('✅ TODOS OS TESTES DE NORMALIZAÇÃO DE REFERÊNCIA PASSARAM COM SUCESSO!');
