// --- INICIALIZAÇÃO DE SEGURANÇA E PREÇOS ---
window.PRECOS_BASE = {};

document.addEventListener('DOMContentLoaded', () => {
    // Busca a tabela de preços no servidor
    fetch('/api/mercado/precos')
        .then(r => r.json())
        .then(data => { window.PRECOS_BASE = data; })
        .catch(e => console.log("Aviso: Falha ao carregar preços do mercado."));
        
    // 1. RECUPERA A ABA SALVA E FORÇA A ABERTURA DELA
    const abaSalva = localStorage.getItem('aba_ativa_fazenda') || 'sede';
    window.trocarAba(abaSalva);

    // 2. RECUPERA MODAL SALVO E REABRE (O Pulo do Gato pro Curral!)
    const modalSalvo = localStorage.getItem('modal_aberto_fazenda');
    if (modalSalvo) {
        setTimeout(() => {
            const modalEl = document.getElementById(modalSalvo);
            if (modalEl) modalEl.style.display = 'flex';
            
            // Apaga a memória logo em seguida para não prender o jogador no modal quando ele sair da fazenda
            localStorage.removeItem('modal_aberto_fazenda');
        }, 100);
    }

    // 3. RECUPERA A POSIÇÃO DA TELA (SCROLL)
    const scrollPos = localStorage.getItem('scroll_pos_fazenda');
    if (scrollPos) {
        setTimeout(() => window.scrollTo(0, parseInt(scrollPos)), 150);
    }
});

// 4. SALVA TUDO ANTES DE QUALQUER RELOAD
window.addEventListener('beforeunload', () => {
    // Salva a altura da tela
    localStorage.setItem('scroll_pos_fazenda', window.scrollY);
    
    // Verifica se existe algum modal HTML aberto na tela (como o modal-curral)
    let modalAtivo = '';
    document.querySelectorAll('div[id^="modal-"]').forEach(m => {
        if (m.style.display === 'flex' || m.style.display === 'block') {
            modalAtivo = m.id;
        }
    });
    
    // Se achou um modal aberto, anota o nome dele. Se não, limpa a memória.
    if (modalAtivo) {
        localStorage.setItem('modal_aberto_fazenda', modalAtivo);
    } else {
        localStorage.removeItem('modal_aberto_fazenda');
    }
});

// --- FUNÇÕES DE NAVEGAÇÃO DE ABAS ---
window.trocarAba = function(nomeDaAba, elementoBotao = null) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
    
    const view = document.getElementById('view-' + nomeDaAba);
    if(view) {
        view.classList.add('active');
    } else {
        const viewSede = document.getElementById('view-sede');
        if(viewSede) viewSede.classList.add('active');
        nomeDaAba = 'sede';
    }
    
    if(elementoBotao) {
        elementoBotao.classList.add('active');
    } else {
        const botaoAutomatico = document.getElementById('btn-' + nomeDaAba);
        if(botaoAutomatico) botaoAutomatico.classList.add('active');
    }
    
    localStorage.setItem('aba_ativa_fazenda', nomeDaAba);
};

// --- FUNÇÕES GERAIS DE MODAL ---
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
