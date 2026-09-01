window.abrirMenuTerra = async function(loteId, statusCorrente) {
    let titulo = "Obras e Infraestrutura";
    let botoesHTML = "";
    let tem_esteira = false;
    
    // 🔥 NOVIDADE: Verifica se tem a máquina (apenas se for mato para poupar processamento)
    if (statusCorrente === 'mato' || !statusCorrente) {
        Swal.fire({ title: 'Avaliando o terreno...', didOpen: () => Swal.showLoading() });
        const fazendaId = window.location.pathname.split('/').pop();
        try {
            const res = await fetch(`/api/barracao/listar?fazenda_id=${fazendaId}`);
            const data = await res.json();
            if (data.sucesso) tem_esteira = data.maquinas.some(m => m.modelo === 'Trator de Esteira');
        } catch(e) {}
    }

    if (statusCorrente === 'mato' || !statusCorrente) {
        titulo = "Desmatamento e Limpeza";
        if (tem_esteira) {
            botoesHTML = `
            <button class="swal2-confirm swal2-styled" style="background-color: #fbc02d; color: #000; width: 100%; margin-bottom: 10px; font-weight: bold;" onclick="enviarObra(${loteId}, 'limpar')">
                <img src="/static/img/trator_esteira.png" style="width: 24px; height: 24px; object-fit: contain; margin-right: 8px;" onerror="this.src='/static/img/trator.png'"> 
                Limpeza c/ Esteira (+ R$ 2.500)
            </button>
            <p style="font-size: 11px; color: #4caf50; font-weight: bold;"><i class="fas fa-check"></i> Trator Próprio (Aluguel R$ 0) | Madeira: R$ 2.500</p>
            `;
        } else {
            botoesHTML = `
            <button class="swal2-confirm swal2-styled" style="background-color: #795548; width: 100%; margin-bottom: 10px;" onclick="enviarObra(${loteId}, 'limpar')">
                <img src="/static/img/arvore.png" style="width: 24px; height: 24px; object-fit: contain; margin-right: 8px;"> 
                Limpar e Vender Madeira (+ R$ 1.000)
            </button>
            <p style="font-size: 11px; color: #aaa;">Aluguel do Trator: R$ 500 | Madeira: R$ 1.500</p>
            `;
        }
    } 
    else if (statusCorrente === 'limpo') {
        titulo = "Destino do Hectare";
        botoesHTML = `
            <button class="swal2-confirm swal2-styled" style="background-color: #e67e22; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'cercar')">
                <img src="/static/img/cerca.png" style="width: 24px; height: 24px; object-fit: contain;"> Cercar para Pasto (R$ 800)
            </button>
            <button class="swal2-confirm swal2-styled" style="background-color: #8d6e63; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'arar')">
                <img src="/static/img/trator.png" style="width: 24px; height: 24px; object-fit: contain;"> Arar p/ Grãos e Cereais (R$ 600)
            </button>
            <button class="swal2-confirm swal2-styled" style="background-color: #5d4037; width: 100%; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; gap: 10px;" onclick="enviarObra(${loteId}, 'covear')">
                <i class="fas fa-seedling" style="font-size: 20px;"></i> Abrir Covas p/ Pomar (R$ 900)
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

window.comprarHectare = function(fazendaId, custoEstimado) {
    Swal.fire({
        title: 'Comprar Novo Hectare?',
        text: `Deseja expandir as terras desta propriedade? O novo hectare virá coberto de mato e custará aproximadamente R$ ${custoEstimado.toLocaleString('pt-BR')}.`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#2e7d32',
        confirmButtonText: 'Sim, Comprar!', cancelButtonText: 'Cancelar', background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Assinando papéis...', didOpen: () => Swal.showLoading() });
            fetch('/api/fazenda/comprar_hectare', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
};
