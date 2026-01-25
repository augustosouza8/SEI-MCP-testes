# Documentação da API do SEI

## Duas Opções de Integração

### 1. SEI WebServices (SOAP) - Nativo
**Endpoint**: `http://[servidor]/sei/controlador_ws.php?servico=sei`

**Documentação oficial**: [SEI-WebServices-v4.0.pdf](https://www.portalsei.df.gov.br/wp-conteudo/uploads/2016/10/SEI-WebServices-v4.0.pdf)

#### Operações Disponíveis:
| Operação | Descrição |
|----------|-----------|
| `consultarProcedimento` | Consultar dados de um processo |
| `consultarDocumento` | Consultar dados de um documento |
| `incluirDocumento` | Incluir documento em processo |
| `gerarProcedimento` | Criar novo processo |
| `enviarProcesso` | Tramitar processo |
| `listarTiposDocumento` | Listar tipos de documentos |
| `listarHipotesesLegais` | Listar hipóteses legais |
| `listarAndamentos` | Listar andamentos do processo |

#### Autenticação:
1. Cadastrar sistema externo em: SEI > Administração > Sistemas
2. Gerar "chave de acesso" para o sistema
3. Usar a chave nas chamadas SOAP

### 2. WSSEI (REST) - Módulo Opcional
**Repositório**: https://github.com/pengovbr/mod-wssei

**URL Base**: `{baseUrl}/sei/modulos/mod-wssei/controlador_ws.php/api/v2`

**Compatibilidade**:
| SEI/SUPER | mod-wssei |
|-----------|-----------|
| 4.0.x | 2.0.x |
| 4.1.x | 2.2.x |
| 5.0.0 | 3.0.0 |

**Autenticação**: JWT Bearer Token (TokenSecret mínimo 32 caracteres)

#### Endpoints REST Disponíveis:

**Autenticação:**
```bash
POST /api/v2/autenticacao
Body: { "usuario": "...", "senha": "..." }
Retorno: { "token": "JWT...", "usuario": {...} }
```

**Processos:**
```bash
GET  /api/v2/procedimentos                    # Listar processos
GET  /api/v2/procedimentos/{id}               # Consultar processo
POST /api/v2/procedimentos                    # Criar processo
PUT  /api/v2/procedimentos/{id}               # Atualizar processo
POST /api/v2/procedimentos/{id}/concluir      # Concluir
POST /api/v2/procedimentos/{id}/reabrir       # Reabrir
POST /api/v2/procedimentos/{id}/atribuir      # Atribuir
POST /api/v2/procedimentos/{id}/dar-ciencia   # Dar ciência
```

**Documentos:**
```bash
GET  /api/v2/procedimentos/{id}/documentos    # Listar documentos
POST /api/v2/procedimentos/{id}/documentos    # Incluir documento (FormData)
GET  /api/v2/documentos/{id}                  # Consultar documento
```

#### Exemplo de Uso (JavaScript):
```javascript
// Login
const { token } = await fetch(baseUrl + '/api/v2/autenticacao', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ usuario: 'user', senha: 'pass' })
}).then(r => r.json());

// Upload documento
const formData = new FormData();
formData.append('tipo_documento', '1');
formData.append('descricao', 'Documento');
formData.append('nivel_acesso', '0');
formData.append('arquivo', file);

await fetch(baseUrl + `/api/v2/procedimentos/${processoId}/documentos`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Documentação**: Coleções Postman no repositório

## Estruturas de Dados Principais

### Procedimento (Processo)
```xml
<Procedimento>
  <IdProcedimento>123</IdProcedimento>
  <ProtocoloProcedimento>12345.678901/2024-00</ProtocoloProcedimento>
  <IdTipoProcedimento>1</IdTipoProcedimento>
  <Especificacao>Descrição do processo</Especificacao>
  <NivelAcessoGlobal>0</NivelAcessoGlobal>
</Procedimento>
```

### Documento
```xml
<Documento>
  <IdDocumento>456</IdDocumento>
  <ProtocoloDocumento>789</ProtocoloDocumento>
  <IdTipoDocumento>2</IdTipoDocumento>
  <Descricao>Ofício de resposta</Descricao>
  <NomeArquivo>oficio.pdf</NomeArquivo>
  <Conteudo>[BASE64]</Conteudo>
  <NivelAcesso>0</NivelAcesso>
  <IdHipoteseLegal></IdHipoteseLegal>
</Documento>
```

### Níveis de Acesso
| Valor | Nível |
|-------|-------|
| 0 | Público |
| 1 | Restrito |
| 2 | Sigiloso |

## Links Úteis
- [Portal PEN](https://www.gov.br/gestao/pt-br/assuntos/processo-eletronico-nacional)
- [Wiki SEI](https://wiki.processoeletronico.gov.br)
- [FAQ WSSEI](https://wiki.processoeletronico.gov.br/pt-br/latest/APP_SEI_Modulo_WSSEI/Perguntas_frequentes.html)
