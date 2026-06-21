// --- INICIALIZAÇÃO DE SEGURANÇA E PREÇOS ---
window.PRECOS_BASE = {};

document.addEventListener('DOMContentLoaded', () => {
    // Busca a tabela de preços no servidor
    fetch('/api/mercado/precos')
        .then(r => r.json())
        .then(data => { window.PRECOS_BASE = data; })
        .catch(e => console.log("Aviso: Falha ao carregar preços do mercado."));
        
    // Mantém a aba que o jogador estava antes de recarregar a página
    const abaSalva = localStorage.getItem('aba_ativa_fazenda') || 'sede';
    const botao = document.getElementById('btn-' + abaSalva);
    if(botao) {
        window.trocarAba(abaSalva, botao, false);
    }
});

// --- FUNÇÕES DE NAVEGAÇÃO DE ABAS ---
window.trocarAba = function(nomeDaAba, elementoBotao, salvar = true) {
    // Esconde todas as abas e tira o destaque dos botões
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    
    // Mostra a aba clicada
    const view = document.getElementById('view-' + nomeDaAba);
    if(view) view.classList.add('active');
    
    // Destaca o botão clicado e salva no celular
    if(elementoBotao) elementoBotao.classList.add('active');
    if(salvar) localStorage.setItem('aba_ativa_fazenda', nomeDaAba);
};

// --- FUNÇÕES GERAIS DE MODAL (O MOTOR DA SEDE) ---
window.abrirModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) {
        modal.style.display = 'flex';
    } else {
        console.error("ERRO: O modal '" + id + "' não foi encontrado no HTML!");
    }
};

window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
};

window.fecharSeClicarFora = function(event, id) {
    if (event.target.id === id) {
        window.fecharModal(id);
    }
};
