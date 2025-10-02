# 🎓 ReprodLocal - Sistema de Reprodução Local de Cursos

ReprodLocal é uma aplicação desktop desenvolvida com Tauri + React + TypeScript para reprodução e gerenciamento de cursos em vídeo localmente, com sistema completo de progresso do usuário e anotações pessoais.

## 🚀 Funcionalidades Principais

- 📹 **Reprodução de Vídeos Locais**: Suporte completo para cursos em vídeo armazenados localmente
- 📊 **Progresso Persistente**: Acompanhamento automático do progresso de visualização
- 📝 **Anotações Pessoais**: Sistema completo de anotações com timestamps
- 🔖 **Bookmarks**: Marcadores para pontos importantes dos vídeos
- ⚙️ **Configurações Personalizáveis**: Preferências do usuário persistentes
- 📋 **Histórico de Atividades**: Log completo das ações do usuário
- 🗄️ **Banco SQLite**: Persistência robusta de dados com migração automática

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Backend**: Rust + Tauri
- **Banco de Dados**: SQLite
- **Interface**: HTML5 Video Player

## 📦 Instalação e Configuração

### Pré-requisitos
- Node.js (v16+)
- Rust (latest stable)
- SQLite3

### Passos de Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd ReprodLocal
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o banco de dados**
```bash
# Windows (PowerShell)
.\scripts\setup-database.ps1

# Ou usando Rust
cargo run --bin init_database
```

4. **Execute em modo desenvolvimento**
```bash
npm run tauri dev
```

5. **Build para produção**
```bash
npm run tauri build
```

## 🗄️ Sistema de Banco de Dados

O ReprodLocal utiliza SQLite para persistência de dados com as seguintes funcionalidades:

### Estrutura Principal
- **Cursos, Módulos e Vídeos**: Organização hierárquica do conteúdo
- **Progresso de Vídeos**: Rastreamento automático do ponto de parada
- **Anotações do Usuário**: Notas com timestamps precisos
- **Bookmarks**: Marcadores para navegação rápida
- **Configurações**: Preferências personalizáveis
- **Log de Atividades**: Histórico completo de ações

### Inicialização Automática
O banco é criado automaticamente durante a primeira execução em:
- **Windows**: `%APPDATA%\ReprodLocal\database.db`
- **Linux/macOS**: `~/.local/share/ReprodLocal/database.db`

### Migração Automática
Sistema robusto de migração que preserva dados existentes durante atualizações.

📖 **Documentação Completa**: Consulte [DATABASE_FEATURES.md](./DATABASE_FEATURES.md) para detalhes técnicos completos.

## 🎯 Como Usar

1. **Adicionar Cursos**: Escaneie diretórios contendo seus cursos em vídeo
2. **Reproduzir Vídeos**: Navegue pela estrutura de cursos e módulos
3. **Fazer Anotações**: Clique para adicionar notas em qualquer momento do vídeo
4. **Criar Bookmarks**: Marque pontos importantes para acesso rápido
5. **Configurar Preferências**: Ajuste tema, velocidade de reprodução, etc.

## 🔧 Scripts Disponíveis

- `npm run tauri dev` - Execução em desenvolvimento
- `npm run tauri build` - Build para produção
- `npm run test` - Executar testes
- `.\scripts\setup-database.ps1` - Configurar banco de dados (Windows)
- `cargo run --bin init_database` - Inicializar banco (Rust)

## 📁 Estrutura do Projeto

```
ReprodLocal/
├── src/                    # Frontend React
├── src-tauri/             # Backend Rust
│   ├── src/
│   │   ├── db.rs          # Sistema de banco de dados
│   │   ├── commands.rs    # Comandos Tauri
│   │   └── lib.rs         # Configuração principal
├── scripts/               # Scripts de inicialização
│   ├── setup-database.ps1 # Script PowerShell
│   └── init_database.rs   # Script Rust
└── DATABASE_FEATURES.md   # Documentação do banco
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para problemas ou dúvidas:
1. Consulte a [documentação do banco](./DATABASE_FEATURES.md)
2. Verifique as [issues existentes](../../issues)
3. Crie uma nova issue se necessário

## 🔧 IDE Recomendada

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
