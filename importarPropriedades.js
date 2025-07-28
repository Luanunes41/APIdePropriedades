require('dotenv').config();

const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const PDFDocument = require('pdfkit'); // <-- Nova dependência para PDF

// Sua Private App Token é carregada do .env
const HUBSPOT_PRIVATE_APP_TOKEN = process.env.HUBSPOT_API_KEY;

// Os HEADERS agora incluem o Bearer Token para autenticação
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${HUBSPOT_PRIVATE_APP_TOKEN}`
};

// URLs dos endpoints da API de propriedades para diferentes objetos
const BASE_URLS = {
  // Endpoints V1 para contatos e negócios.
  // Estes devem aceitar o Bearer Token do Private App.
  contact: 'https://api.hubapi.com/properties/v1/contacts/properties',
  deal: 'https://api.hubspot.com/properties/v1/deals/properties',
  
  // Endpoint V3 corrigido para tickets. V3 sempre usa Bearer Token.
  ticket: 'https://api.hubspot.com/crm/v3/properties/tickets', 
};

// Array para armazenar os resultados de cada tentativa de criação de propriedade
const creationResults = [];

/**
 * Converte uma string de opções separadas por '|' em um array de objetos para propriedades de enumeração.
 * @param {string} optionString - A string contendo as opções.
 * @returns {Array<Object>} Um array de objetos com 'label' e 'value'.
 */
function buildOptions(optionString) {
  return optionString.split('|').map(opt => ({
    label: opt.trim().charAt(0).toUpperCase() + opt.trim().slice(1),
    value: opt.trim().toLowerCase()
  }));
}

/**
 * Tenta criar uma propriedade no HubSpot e registra o resultado.
 * @param {string} objectType - O tipo de objeto (contact, deal, ticket).
 * @param {Object} data - Os dados da propriedade a ser criada.
 */
async function createProperty(objectType, data) {
  const url = BASE_URLS[objectType];
  let status = '❌ Falha'; // Status inicial de falha
  let errorMessage = '';

  try {
    const response = await axios.post(url, data, { headers: HEADERS });
    console.log(`✅ Criado: ${data.name} (${objectType})`);
    status = '✅ Sucesso'; // Atualiza para sucesso
  } catch (error) {
    // Tenta extrair a mensagem de erro mais útil da resposta da API
    errorMessage = error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error(`❌ Erro (${data.name} - ${objectType}):`, errorMessage);
  } finally {
    // Armazena o resultado no array creationResults
    creationResults.push({
      objectType: objectType,
      name: data.name,
      label: data.label,
      status: status,
      errorMessage: errorMessage,
      timestamp: new Date().toLocaleString('pt-BR') // Formato de data e hora local
    });
  }
}

/**
 * Gera um relatório em PDF com os resultados da importação das propriedades.
 * @param {Array<Object>} results - O array de resultados das tentativas de criação.
 */
function generatePdfReport(results) {
  const doc = new PDFDocument();
  const timestampForFilename = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '_');
  const filename = `relatorio_importacao_propriedades_${timestampForFilename}.pdf`;
  doc.pipe(fs.createWriteStream(filename));

  doc.fontSize(18).text('Relatório de Importação de Propriedades HubSpot', { align: 'center' }).moveDown();
  doc.fontSize(10).text(`Data da Execução: ${new Date().toLocaleString('pt-BR')}`).moveDown();

  if (results.length === 0) {
    doc.fontSize(12).text('Nenhuma propriedade foi processada a partir do CSV.', { align: 'center' });
  } else {
    // Tabela/Lista de resultados
    results.forEach(result => {
      // Estilo para o status
      const statusColor = result.status === '✅ Sucesso' ? 'green' : (result.status === '⚠️ Objeto Inválido' ? 'orange' : 'red');
      
      doc.fontSize(11).fillColor('black').text(`Objeto: ${result.objectType}`);
      doc.text(`Nome Interno: ${result.name}`);
      doc.text(`Label: ${result.label}`);
      doc.text(`Status: `)
         .fillColor(statusColor)
         .text(`${result.status}`, { continued: false }) // Continua na mesma linha para o status
         .fillColor('black'); // Volta ao preto para o restante

      if (result.errorMessage) {
        doc.text(`Mensagem de Erro: ${result.errorMessage}`);
      }
      doc.text(`Hora: ${result.timestamp}`).moveDown(1); // Espaço entre os itens
    });
  }

  doc.end();
  console.log(`\n📄 Relatório em PDF gerado: ${filename}`);
}

/**
 * Lê o arquivo CSV e processa cada linha para criar propriedades no HubSpot.
 * @param {string} caminhoCSV - O caminho para o arquivo CSV.
 */
function importarCSV(caminhoCSV) {
  fs.createReadStream(caminhoCSV)
    .pipe(csv())
    .on('data', async (row) => {
      const objectType = row.objectType?.trim()?.toLowerCase(); // Adiciona validação de existência
      const propertyName = row.name?.trim(); // Pega o nome da propriedade para o log

      // Verifica se o objectType é válido ou se a linha está malformada
      if (!objectType || !BASE_URLS[objectType]) {
        console.warn(`⚠️ Objeto inválido ou linha malformada ignorada (Propriedade: ${propertyName || 'N/A'}, Objeto: ${objectType || 'N/A'})`);
        creationResults.push({
            objectType: objectType || 'N/A',
            name: propertyName || 'N/A',
            label: row.label?.trim() || 'N/A',
            status: '⚠️ Objeto Inválido / Linha Ignorada',
            errorMessage: `Objeto '${objectType}' não reconhecido ou linha CSV incompleta.`,
            timestamp: new Date().toLocaleString('pt-BR')
        });
        return;
      }

      // Constrói o objeto de propriedade
      const propriedade = {
        name: propertyName,
        label: row.label?.trim(),
        description: row.description?.trim(),
        groupName: row.groupName?.trim(),
        type: row.type?.trim(),
        fieldType: row.fieldType?.trim(),
        formField: true
      };

      // Adiciona opções se for um tipo de enumeração
      if (propriedade.type === 'enumeration' && row.options) {
        propriedade.options = buildOptions(row.options);
      }
      // Adiciona se for um campo de número e não tiver um valor padrão, garantindo que seja um número
      if (propriedade.type === 'number' && propriedade.fieldType === 'number') {
        propriedade.numberDisplayHint = 'number'; // Garante que será tratado como número no HubSpot
      }

      await createProperty(objectType, propriedade);
    })
    .on('end', () => {
      console.log('✅ Importação finalizada!');
      generatePdfReport(creationResults); // Chama a geração do relatório no final
    })
    .on('error', (error) => {
        console.error('❌ Erro na leitura do CSV:', error.message);
        creationResults.push({
            objectType: 'N/A',
            name: 'Erro de Leitura CSV',
            label: 'N/A',
            status: '❌ Erro Crítico',
            errorMessage: `Erro ao ler o arquivo CSV: ${error.message}`,
            timestamp: new Date().toLocaleString('pt-BR')
        });
        generatePdfReport(creationResults); // Tenta gerar relatório mesmo com erro na leitura
    });
}

// Inicia a importação do CSV
importarCSV('propriedades.csv');