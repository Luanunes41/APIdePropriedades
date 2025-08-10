# Criando Propriedades no HubSpot via CSV

Este projeto Node.js permite importar propriedades personalizadas para diferentes objetos (Contatos, Negócios e Tickets) no HubSpot, lendo os dados de um arquivo CSV. Ele utiliza a autenticação via "Private App Access Token" (PAT), que é a abordagem recomendada e mais segura para integração com o HubSpot.

## 🚀 Funcionalidades

- Importa propriedades personalizadas para:
    - Contatos
    - Negócios
    - Tickets
- Lê a configuração das propriedades a partir de um arquivo CSV.
- Suporta propriedades do tipo "enumeration" (seleção), convertendo as opções de uma string para o formato exigido pelo HubSpot.
- Utiliza um "Private App Access Token" (PAT) para autenticação segura.

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript.
- **`dotenv`**: Para carregar variáveis de ambiente de um arquivo `.env`.
- **`fs`**: Módulo nativo do Node.js para manipulação de sistema de arquivos (leitura do CSV).
- **`csv-parser`**: Biblioteca para analisar arquivos CSV.
- **`axios`**: Cliente HTTP baseado em Promises para fazer requisições à API do HubSpot.

## ⚙️ Pré-requisitos

Antes de executar o script, certifique-se de ter o seguinte instalado e configurado:

- [Node.js](https://nodejs.org/en/download/) (versão 14 ou superior recomendada).
- Um **Private App** configurado na sua conta HubSpot com os escopos necessários para **criar propriedades**.
    - Os escopos mínimos recomendados são:
        - `crm.objects.contacts.write`
        - `crm.objects.deals.write`
        - `crm.objects.tickets.write` (ou apenas `tickets` se `crm.objects.tickets.write` não estiver disponível para Private Apps).
    - Obtenha o **Access Token** do seu Private App. Ele começará com `pat-`.

## 📦 Instalação

1.  **Clone este repositório** (ou crie os arquivos na sua máquina):
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd PropriedadesHubspot
    ```
    *Se você não tem um repositório, apenas crie a pasta `PropriedadesHubspot` e coloque os arquivos dentro.*

2.  **Instale as dependências** do projeto:
    ```bash
    npm install dotenv csv-parser axios
    ```

## 🔑 Configuração (Variáveis de Ambiente)

Crie um arquivo chamado `.env` na raiz do projeto (no mesmo diretório de `importarPropriedades.js`). Adicione seu Private App Access Token a este arquivo:

```dotenv

HUBSPOT_API_KEY=seu_private_app_access_token_aqui
