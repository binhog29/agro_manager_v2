
// ==========================================
// INICIALIZAÇÃO SEGURA
// ==========================================
window.PRECOS_BASE = {};

fetch('/api/mercado/precos')
    .then(r => r.json())
    .then(data => { window.PRECOS_BASE = data; })
    .catch(err => console.error("Erro ao carregar preços:", err));

// ==========================================
// ATUALIZAR PREÇO E PESO DINAMICAMENTE
// ==========================================
window.atualizarPrecoDinamico = function(id_ia) {
    const key = id_ia ? id_ia.toLowerCase() : '';
    const fase = document.getElementById('fase-' + id_ia).value;
    
    const dadosAnimal = window.PRECOS_BASE[key];
    
    if (dadosAnimal) {
        // 1. Atualiza o Preço dinamicamente
        const precoFinal = dadosAnimal[fase] || 0;
        const spanVal = document.getElementById('val-' + id_ia);
        if (spanVal) {
            spanVal.innerText = Math.round(precoFinal).toLocaleString('pt-BR');
        }
        
        // 2. Atualiza o Peso dinamicamente junto com a fase (Filhote ou Adulto)
        const pesoSpan = document.getElementById('peso-' + id_ia);
        if (pesoSpan) {
            const pesoDinamico = fase === 'filhote' ? dadosAnimal.peso_filhote : dadosAnimal.peso_adulto;
            const unidade = dadosAnimal.unidade || '@';
            pesoSpan.innerText = `${pesoDinamico} ${unidade}`;
        }
    }
}

// O "Cérebro" que lembra o que estamos comprando
let compraAtual = { tipo: '', id_ia: '', id_anuncio: '', precoUnidade: 0, fase: '', sexo: '' };

// ==========================================
// COMPRA DA INTELIGÊNCIA ARTIFICIAL (IA)
// ==========================================
window.prepararCompraIA = function(id_ia) {
    const key = id_ia ? id_ia.toLowerCase() : '';
    const fase = document.getElementById('fase-' + id_ia).value;
    const sexo = document.getElementById('sexo-' + id_ia).value;
    
    const precoFinal = window.PRECOS_BASE[key] ? window.PRECOS_BASE[key][fase] : 0;
    
    // Salva que é uma compra da IA usando a chave tratada
    compraAtual = { tipo: 'ia', id_ia: key, precoUnidade: precoFinal, fase: fase, sexo: sexo };
    
    document.getElementById('modal-animal-nome').innerText = `${fase.charAt(0).toUpperCase() + fase.slice(1)} - ${id_ia.charAt(0).toUpperCase() + id_ia.slice(1)} (${sexo})`;
    
    const qtdInput = document.getElementById('modal-quantidade');
    qtdInput.value = 1;
    qtdInput.disabled = false;

    definirCaminhao(id_ia);
    atualizarTotalModal();
    document.getElementById('modal-logistica').style.display = 'flex';
}

// ==========================================
// COMPRA DA COMUNIDADE (P2P)
// ==========================================
window.prepararCompraComunidade = function(id_anuncio, raca, valor) {
    // Salva que é uma compra de player real
    compraAtual = { tipo: 'comunidade', id_anuncio: id_anuncio, precoUnidade: parseFloat(valor), raca: raca };
    
    document.getElementById('modal-animal-nome').innerText = `Lote Comunidade - ${raca.charAt(0).toUpperCase() + raca.slice(1)}`;
    
    const qtdInput = document.getElementById('modal-quantidade');
    qtdInput.value = 1;
    qtdInput.disabled = true; // Bloqueia! Não dá pra comprar só "metade" de um boi de outro jogador

    definirCaminhao(raca);
    atualizarTotalModal();
    document.getElementById('modal-logistica').style.display = 'flex';
}

// --- FUNÇÕES COMPARTILHADAS DE LOGÍSTICA ---
function definirCaminhao(raca) {
    const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
    const imgCaminhao = document.getElementById('img-veiculo');
    imgCaminhao.src = peixes.includes(raca.toLowerCase()) ? '/static/img/caminhao_bau.png' : '/static/img/caminhao_boiadeiro.png';
}

window.fecharModal = function() {
    document.getElementById('modal-logistica').style.display = 'none';
    document.getElementById('modal-logistica').style.opacity = '1';
}

window.atualizarTotalModal = function() {
    const qtd = parseInt(document.getElementById('modal-quantidade').value) || 0;
    const usaCaminhaoProprio = document.getElementById('check-caminhao-proprio').checked;
    const fretePorCabeca = usaCaminhaoProprio ? 0 : 50.0;
    
    const custoGado = qtd * compraAtual.precoUnidade;
    const custoFrete = qtd * fretePorCabeca;
    const total = custoGado + custoFrete;
    
    document.getElementById('modal-total-calc').innerHTML = `
        <div style="font-size: 13px; color: #aaa;">Gado: R$ ${custoGado.toLocaleString('pt-BR')} + Frete: R$ ${custoFrete.toLocaleString('pt-BR')}</div>
        <b style="color:#4caf50; font-size: 18px;">Total: R$ ${total.toLocaleString('pt-BR')}</b>
    `;
}

window.confirmarCompra = function() {
    const qtd = document.getElementById('modal-quantidade').value;
    const destino = document.getElementById('modal-destino').value;
    
    if(!destino) {
        Swal.fire('Atenção', 'Você precisa comprar uma propriedade no mapa para receber a carga!', 'warning');
        return;
    }

    // Trava a tela para evitar duplo clique
    document.getElementById('modal-logistica').style.opacity = '0.5';

    // ROTEADOR: Manda pro backend correto dependendo de quem estamos comprando
    if (compraAtual.tipo === 'comunidade') {
        fetch('/api/mercado/comprar_leilao', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anuncio_id: compraAtual.id_anuncio, fazenda_id: parseInt(destino) })
        })
        .then(r => r.json()).then(tratarResposta).catch(tratarErro);
    } else {
        fetch('/api/mercado/comprar_ia', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raca: compraAtual.id_ia, fase: compraAtual.fase, sexo: compraAtual.sexo, quantidade: qtd, destino_id: destino })
        })
        .then(r => r.json()).then(tratarResposta).catch(tratarErro);
    }
}

function tratarResposta(d) {
    if (d.sucesso) {
        const imgSrc = document.getElementById('img-veiculo').src;
        Swal.fire({ title: 'Carga Despachada! ✅', text: d.msg, imageUrl: imgSrc, imageWidth: 140, background: '#2a2a2a', color: '#fff', confirmButtonColor: '#2e7d32', allowOutsideClick: false })
        .then(() => location.reload());
    } else {
        Swal.fire({ title: 'Problema na Compra', text: d.erro, icon: 'error', background: '#2a2a2a', color: '#fff' });
        document.getElementById('modal-logistica').style.opacity = '1';
    }
}

function tratarErro(e) {
    console.error(e);
    Swal.fire({ title: 'Erro de Ligação', text: 'O servidor não respondeu.', icon: 'warning', background: '#2a2a2a', color: '#fff' });
    document.getElementById('modal-logistica').style.opacity = '1';
}

// ==========================================
// CANCELAR ANÚNCIO
// ==========================================
window.cancelar = function(anuncioId) {
    Swal.fire({ title: 'Cancelar Anúncio?', text: "O animal voltará para o curral.", icon: 'warning', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#f44336', confirmButtonText: 'Sim, cancelar!' })
    .then((result) => {
        if (result.isConfirmed) {
            fetch('/api/mercado/cancelar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({anuncio_id: anuncioId}) })
            .then(r => r.json()).then(d => { if(d.sucesso) location.reload(); else Swal.fire('Erro', d.erro, 'error'); });
        }
    });
}
