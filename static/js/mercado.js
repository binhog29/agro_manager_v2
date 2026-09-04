// ==========================================
// INICIALIZAÇÃO SEGURA E SINCRONIZADA
// ==========================================
window.PRECOS_BASE = {};

fetch('/api/mercado/precos')
    .then(r => r.json())
    .then(data => { 
        window.PRECOS_BASE = data; 
        
        document.querySelectorAll('[id^="val-"]').forEach(el => {
            let id_ia = el.id.replace('val-', '');
            
            let selectFase = document.getElementById('fase-' + id_ia);
            let selectSexo = document.getElementById('sexo-' + id_ia);
            
            if(selectFase) selectFase.addEventListener('change', () => window.atualizarPrecoDinamico(id_ia));
            if(selectSexo) selectSexo.addEventListener('change', () => window.atualizarPrecoDinamico(id_ia));
            
            window.atualizarPrecoDinamico(id_ia);
        });
    })
    .catch(err => console.error("Erro ao carregar preços:", err));

// ==========================================
// ATUALIZAR PREÇO E PESO DINAMICAMENTE
// ==========================================
window.atualizarPrecoDinamico = function(id_ia) {
    const key = id_ia ? id_ia.toLowerCase() : '';
    
    const selectFase = document.getElementById('fase-' + id_ia);
    const selectSexo = document.getElementById('sexo-' + id_ia);
    
    const fase = selectFase ? selectFase.value : 'adulto';
    const sexo = selectSexo ? selectSexo.value : 'M';
    
    const dadosAnimal = window.PRECOS_BASE[key];
    
    if (dadosAnimal) {
        let precoFinal = dadosAnimal[fase] || 0;
        
        if (sexo === 'F') {
            precoFinal = precoFinal * 0.90;
        }
        
        const spanVal = document.getElementById('val-' + id_ia);
        if (spanVal) spanVal.innerText = Math.round(precoFinal).toLocaleString('pt-BR');
        
        const pesoSpan = document.getElementById('peso-' + id_ia);
        if (pesoSpan) {
            const pesoDinamico = fase === 'filhote' ? dadosAnimal.peso_filhote : dadosAnimal.peso_adulto;
            pesoSpan.innerText = `${pesoDinamico} ${dadosAnimal.unidade || '@'}`;
        }
    }
}

let compraAtual = { tipo: '', id_ia: '', id_anuncio: '', precoUnidade: 0, fase: '', sexo: '', raca: '' };

document.addEventListener('DOMContentLoaded', () => {
    const modalDestino = document.getElementById('modal-destino');
    if(modalDestino) modalDestino.addEventListener('change', window.verificarCaminhaoDestino);
});

// ==========================================
// VERIFICADOR DE CAMINHÃO (FRETE GRÁTIS) E FOTO INTELIGENTE
// ==========================================
window.verificarCaminhaoDestino = async function() {
    const destino = document.getElementById('modal-destino').value;
    const raca = compraAtual.id_ia || compraAtual.raca;
    if (!destino || !raca) return;

    const racaLower = raca.toLowerCase();
    const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
    const aves_e_medios = ['galinha', 'pato', 'peru', 'porco', 'ovelha', 'cabra'];

    let modelosAceitos = [];
    let nomeVeiculoMsg = '';

    if (peixes.includes(racaLower)) {
        modelosAceitos = ['Caminhão Baú (Frios)'];
        nomeVeiculoMsg = 'Caminhão Baú (Frios)';
    } else if (aves_e_medios.includes(racaLower)) {
        modelosAceitos = ['Caminhonete Nova', 'Caminhonete Usada', 'Caminhão Boiadeiro'];
        nomeVeiculoMsg = 'Caminhonete ou Caminhão';
    } else {
        modelosAceitos = ['Caminhão Boiadeiro'];
        nomeVeiculoMsg = 'Caminhão Boiadeiro';
    }

    const checkbox = document.getElementById('check-caminhao-proprio');
    const aviso = checkbox.parentElement.nextElementSibling;
    const imgCaminhao = document.getElementById('img-veiculo');

    try {
        // 🔥 A MÁGICA: O "?t=..." envia a hora exata em milissegundos. 
        // Isso obriga o celular a buscar o diesel REAL no servidor e ignorar a memória!
        const res = await fetch(`/api/barracao/listar?fazenda_id=${destino}&t=${new Date().getTime()}`);
        const data = await res.json();

        if (data.sucesso) {
            const veiculosPossuidos = data.maquinas.filter(m => modelosAceitos.includes(m.modelo));
            
            // Filtra os que têm combustível e saúde suficientes
            const veiculosProntos = veiculosPossuidos.filter(m => m.combustivel >= 15 && m.saude >= 5);

            if (veiculosProntos.length > 0) {
                veiculosProntos.sort((a, b) => modelosAceitos.indexOf(a.modelo) - modelosAceitos.indexOf(b.modelo));
                const veiculoEscolhido = veiculosProntos[0];

                checkbox.disabled = false;
                checkbox.checked = true;
                aviso.innerText = `✅ Você usará o ${veiculoEscolhido.modelo}! Frete Grátis.`;
                aviso.style.color = '#4caf50';

                if(veiculoEscolhido.imagem) {
                    imgCaminhao.src = '/static/img/' + veiculoEscolhido.imagem;
                }

            } else if (veiculosPossuidos.length > 0) {
                // Tem a máquina, mas está quebrada ou sem diesel
                checkbox.disabled = true;
                checkbox.checked = false;
                aviso.innerText = `❌ Seu ${veiculosPossuidos[0].modelo} está sem diesel (<15%) ou quebrado.`;
                aviso.style.color = '#f44336';
                definirCaminhaoPadrao(racaLower); 
            } else {
                // Não tem a máquina
                checkbox.disabled = true;
                checkbox.checked = false;
                aviso.innerText = `❌ Sem ${nomeVeiculoMsg} nesta fazenda. Frete será cobrado.`;
                aviso.style.color = '#f44336';
                definirCaminhaoPadrao(racaLower); 
            }
        }
    } catch (e) {
        console.error(e);
    }
    window.atualizarTotalModal();
}

// ==========================================
// COMPRA DA INTELIGÊNCIA ARTIFICIAL (IA)
// ==========================================
window.prepararCompraIA = function(id_ia) {
    const key = id_ia ? id_ia.toLowerCase() : '';
    
    const selectFase = document.getElementById('fase-' + id_ia);
    const selectSexo = document.getElementById('sexo-' + id_ia);
    
    const fase = selectFase ? selectFase.value : 'adulto';
    const sexo = selectSexo ? selectSexo.value : 'M';
    
    let precoFinal = window.PRECOS_BASE[key] ? window.PRECOS_BASE[key][fase] : 0;
    
    if (sexo === 'F') {
        precoFinal = precoFinal * 0.90;
    }
    
    compraAtual = { tipo: 'ia', id_ia: key, raca: key, precoUnidade: precoFinal, fase: fase, sexo: sexo };
    document.getElementById('modal-animal-nome').innerText = `${fase.charAt(0).toUpperCase() + fase.slice(1)} - ${id_ia.charAt(0).toUpperCase() + id_ia.slice(1)} (${sexo})`;
    
    const qtdInput = document.getElementById('modal-quantidade');
    qtdInput.value = 1;
    qtdInput.disabled = false;

    definirCaminhaoPadrao(id_ia);
    document.getElementById('modal-logistica').style.display = 'flex';
    window.verificarCaminhaoDestino(); 
}

// ==========================================
// COMPRA DA COMUNIDADE (P2P)
// ==========================================
window.prepararCompraComunidade = function(id_anuncio, raca, valor) {
    compraAtual = { tipo: 'comunidade', id_anuncio: id_anuncio, precoUnidade: parseFloat(valor), raca: raca };
    document.getElementById('modal-animal-nome').innerText = `Lote Comunidade - ${raca.charAt(0).toUpperCase() + raca.slice(1)}`;
    
    const qtdInput = document.getElementById('modal-quantidade');
    qtdInput.value = 1;
    qtdInput.disabled = true;

    definirCaminhaoPadrao(raca);
    document.getElementById('modal-logistica').style.display = 'flex';
    window.verificarCaminhaoDestino(); 
}

function definirCaminhaoPadrao(raca) {
    const racaLower = raca.toLowerCase();
    const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
    const aves_e_medios = ['galinha', 'pato', 'peru', 'porco', 'ovelha', 'cabra'];
    
    const imgCaminhao = document.getElementById('img-veiculo');
    
    if (peixes.includes(racaLower)) {
        imgCaminhao.src = '/static/img/caminhao_bau.png';
    } else if (aves_e_medios.includes(racaLower)) {
        imgCaminhao.src = '/static/img/caminhonete_usada.png';
    } else {
        imgCaminhao.src = '/static/img/caminhao_boiadeiro.png';
    }
}

window.fecharModal = function() {
    document.getElementById('modal-logistica').style.display = 'none';
    document.getElementById('modal-logistica').style.opacity = '1';
}

window.atualizarTotalModal = function() {
    const qtd = parseInt(document.getElementById('modal-quantidade').value) || 0;
    const usaCaminhaoProprio = document.getElementById('check-caminhao-proprio').checked;
    
    let fretePorCabeca = 50.0;
    if (compraAtual.raca) {
        const racaLower = compraAtual.raca.toLowerCase();
        const aves = ['galinha', 'pato', 'peru'];
        const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
        const medios = ['porco', 'ovelha', 'cabra'];

        if (aves.includes(racaLower) || peixes.includes(racaLower)) {
            fretePorCabeca = 5.0;
        } else if (medios.includes(racaLower)) {
            fretePorCabeca = 15.0;
        }
    }
    
    if (usaCaminhaoProprio) {
        fretePorCabeca = 0.0;
    }
    
    const custoAnimais = qtd * compraAtual.precoUnidade;
    const custoFrete = qtd * fretePorCabeca;
    const total = custoAnimais + custoFrete;
    
    document.getElementById('modal-total-calc').innerHTML = `
        <div style="font-size: 13px; color: #aaa;">Animais: R$ ${custoAnimais.toLocaleString('pt-BR')} + Frete: R$ ${custoFrete.toLocaleString('pt-BR')}</div>
        <b style="color:#4caf50; font-size: 18px;">Total: R$ ${total.toLocaleString('pt-BR')}</b>
    `;
}

window.confirmarCompra = function() {
    const qtd = document.getElementById('modal-quantidade').value;
    const destino = document.getElementById('modal-destino').value;
    const usaCaminhao = document.getElementById('check-caminhao-proprio').checked; 
    
    if(!destino) return Swal.fire('Atenção', 'Você precisa de uma propriedade!', 'warning');
    document.getElementById('modal-logistica').style.opacity = '0.5';

    if (compraAtual.tipo === 'comunidade') {
        fetch('/api/mercado/comprar_leilao', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anuncio_id: compraAtual.id_anuncio, fazenda_id: parseInt(destino), usa_caminhao: usaCaminhao })
        })
        .then(r => r.json()).then(tratarResposta).catch(tratarErro);
    } else {
        fetch('/api/mercado/comprar_ia', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raca: compraAtual.raca, fase: compraAtual.fase, sexo: compraAtual.sexo, quantidade: qtd, destino_id: destino, usa_caminhao: usaCaminhao })
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
    Swal.fire({ title: 'Erro de Ligação', text: 'O servidor não respondeu.', icon: 'warning', background: '#2a2a2a', color: '#fff' });
    document.getElementById('modal-logistica').style.opacity = '1';
}

window.cancelar = function(anuncioId) {
    Swal.fire({ title: 'Cancelar Anúncio?', text: "O animal voltará para o curral.", icon: 'warning', background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#f44336', confirmButtonText: 'Sim, cancelar!' })
    .then((result) => {
        if (result.isConfirmed) {
            fetch('/api/mercado/cancelar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({anuncio_id: anuncioId}) })
            .then(r => r.json()).then(d => { if(d.sucesso) location.reload(); else Swal.fire('Erro', d.erro, 'error'); });
        }
    });
}
