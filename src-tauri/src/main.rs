// Ponto de entrada do "lado nativo" do app. Hoje não expõe nenhum comando
// customizado — toda a lógica vive no frontend (React), em src/lib/calculos.js.
// Se no futuro for necessário acesso a sistema de arquivos, notificações nativas
// ou uma cotação obtida via requisição HTTP feita pelo lado Rust (mais seguro
// que fazer fetch direto do frontend), os comandos entram aqui com #[tauri::command].

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erro ao iniciar a aplicação Carteira Holder");
}
