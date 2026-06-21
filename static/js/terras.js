// static/js/terras.js

window.abrirMenuTerra = function(loteId, statusCorrente) {
    let titulo = "Obras e Infraestrutura";
    let botoesHTML = "";

    if (statusCorrente === 'mato' || !statusCorrente) {
        titulo = "Desmatamento e Limpeza";
        botoesHTML = `
        <button class="swal2-confirm swal2-styled" style="background-color: #795548; width: 100%; margin-bottom: 10px;" onclick="enviarObra(${loteId}, 'limpar')">
        <img src="/static/img/arvore.png" style="width: 24px; height: 24px; object-fit: contain;"> Limpar e Vender Madeira (+ R$ 1.000)
        <i class="fas fa-tree"></i> 
        </button>
        <p style="font-size: 11px; color: #aaa;">Custo do Trator: R$ 500 | Madeira: R$ 1.500</p>
        `;
    } 
        else if (statusCorrente === 'limpo') {
        titulo = "Destino do Hectare";
        botoesHTML = `
            <button class="swal2-confirm swal2-styled" style="background-color: #e67e22; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'cercar')">
                <img src="/static/img/cerca.png" style="width: 24px; height: 24px; object-fit: contain;"> Cercar para Pasto (Custo: R$ 800)
            </button>
            <button class="swal2-confirm swal2-styled" style="background-color: #8d6e63; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'arar')">
                <img src="/static/img/trator.png" style="width: 24px; height: 24px; object-fit: contain;"> Arar para Cultivo (Custo: R$ 600)
            </button>
        `;
    }
        else if (statusCorrente === 'cercado') {
        titulo = "Formação de Pastagem";
        botoesHTML = `
            <button class="swal2-confirm swal2-styled" style="background-color: #2e7d32; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'plantar_braquiaria')">
                <img src="/static/img/capim_braquiaria.png" style="width: 24px; height: 24px; object-fit: contain;"> Plantar Braquiária (R$ 300)
            </button>
            <button class="swal2-confirm swal2-styled" style="background-color: #1b5e20; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'plantar_mombaca')">
                <img src="/static/img/capim_mombaca.png" style="width: 24px; height: 24px; object-fit: contain;"> Plantar Mombaça (R$ 450)
            </button>
        `;
    }
    else if (statusCorrente === 'arado') {
        botoesHTML = `<p style="color: #aaa; font-size: 13px;"><i class="fas fa-lock"></i> O mercado de sementes será liberado em breve.</p>`;
    }

    Swal.fire({
        title: titulo,
        html: botoesHTML,
        background: '#2a2a2a',
        color: '#fff',
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: '#555'
    });
};

window.enviarObra = function(loteId, acao_escolhida) {
    Swal.fire({ title: 'Processando a obra...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    fetch('/api/fazenda/obras', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ lote_id: loteId, acao: acao_escolhida })
    })
    .then(r => r.json())
    .then(d => {
        if(d.sucesso) {
            Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    }).catch(e => {
        Swal.fire('Erro', 'Falha na comunicação com a fazenda.', 'error');
    });
};
