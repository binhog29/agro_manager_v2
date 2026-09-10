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

window.atualizarPrecoDinamico = function(id_ia) {
    const key = id_ia ? id_ia.toLowerCase() : '';
    const selectFase = document.getElementById('fase-' + id_ia);
    const selectSexo = document.getElementById('sexo-' + id_ia);
    const fase = selectFase ? selectFase.value : 'adulto';
    const sexo = selectSexo ? selectSexo.value : 'M';
    const dadosAnimal = window.PRECOS_BASE[key];
    
    if (dadosAnimal) {
        let precoFinal = dadosAnimal[fase] || 0;
        if (sexo === 'F') precoFinal = precoFinal * 0.90;
        
        const spanVal = document.getElementById('val-' + id_ia);
        if (spanVal) spanVal.innerText = Math.round(precoFinal).toLocaleString('pt-BR');
        
        const pesoSpan = document.getElementById('peso-' + id_ia);
        if (pesoSpan) {
            const pesoDinamico = fase === 'filhote' ? dadosAnimal.peso_filhote : dadosAnimal.peso_adulto;
            pesoSpan.innerText = `${pesoDinamico} ${dadosAnimal.unidade || '@'}`;
        }
    }
}

let carrinhoLoteIA = [];
let compraAtual = { tipo: '', id_anuncio: '', precoTotal: 0, raca: '' };

document.addEventListener('DOMContentLoaded', () => {
    const modalDestino = document.getElementById('modal-destino');
    if(modalDestino) modalDestino.addEventListener('change', window.verificarCaminhaoDestino);
});

window.alterarQtd = function(idIa, delta) {
    let input = document.getElementById('qtd-' + idIa);
    if (!input) return;
    let atual = parseInt(input.value) || 1;
    let novo = atual + delta;
    if (novo < 1) novo = 1;
    input.value = novo;
}

// ADICIONAR AO CARRINHO AO CLICAR NO BOTÃO
window.adicionarAoCarrinho = function(idIa) {
    let inputQtd = document.getElementById('qtd-' + idIa);
    let qtd = parseInt(inputQtd.value) || 1;
    let selectFase = document.getElementById('fase-' + idIa);
    let selectSexo = document.getElementById('sexo-' + idIa);
    let valEl = document.getElementById('val-' + idIa);
    
    let fase = selectFase ? selectFase.value : 'adulto';
    let sexo = selectSexo ? selectSexo.value : 'M';
    let precoUnit = valEl ? parseFloat(valEl.innerText.replace(/\./g, '').replace(',', '.')) || 0 : 0;

    // Procura se já existe no carrinho exatamente o mesmo animal com a mesma fase e sexo
    let existente = carrinhoLoteIA.find(i => i.raca === idIa && i.fase === fase && i.sexo === sexo);
    if (existente) {
        existente.quantidade += qtd;
    } else {
        carrinhoLoteIA.push({
            raca: idIa,
            fase: fase,
            sexo: sexo,
            quantidade: qtd,
            precoUnitario: precoUnit
        });
    }

    window.atualizarBarraCarrinho();

    Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `${qtd}x ${idIa.capitalize()} (${fase}, ${sexo}) adicionado!`,
        showConfirmButton: false, timer: 1500, background: '#222', color: '#fff'
    });
}

window.atualizarBarraCarrinho = function() {
    let totalItens = 0;
    let valorTotalGeral = 0;

    carrinhoLoteIA.forEach(item => {
        totalItens += item.quantidade;
        valorTotalGeral += (item.quantidade * item.precoUnitario);
    });

    let barra = document.getElementById('barra-carrinho-flutuante');
    if (barra) {
        if (totalItens > 0) {
            barra.style.display = 'flex';
            document.getElementById('txt-qtd-total').innerText = totalItens;
            document.getElementById('txt-valor-total').innerText = 'R$ ' + valorTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2});
        } else {
            barra.style.display = 'none';
        }
    }
}

// ABRE LISTA DO CARRINHO PARA CONFERÊNCIA
window.abrirResumoCarrinho = function() {
    if (carrinhoLoteIA.length === 0) return;

    let htmlLista = '<div style="text-align: left; max-height: 40vh; overflow-y: auto;">';
    carrinhoLoteIA.forEach((item, index) => {
        let subtotal = item.quantidade * item.precoUnitario;
        htmlLista += `
            <div style="background: #222; padding: 10px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <b style="color: #4caf50; text-transform: capitalize;">${item.quantidade}x ${item.raca}</b>
                    <div style="font-size: 11px; color: #aaa;">Fase: ${item.fase} | Sexo: ${item.sexo}</div>
                    <div style="font-size: 11px; color: #ff9800;">R$ ${subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                </div>
                <button onclick="removerItemCarrinho(${index})" style="background: #f44336; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;"><i class="fas fa-trash"></i></button>
            </div>
        `;
    });
    htmlLista += '</div>';

    Swal.fire({
        title: '🛒 Seu Carrinho',
        html: htmlLista,
        background: '#1a1a1a', color: '#fff',
        confirmButtonText: 'Fechar', confirmButtonColor: '#555'
    });
}

window.removerItemCarrinho = function(index) {
    carrinhoLoteIA.splice(index, 1);
    window.atualizarBarraCarrinho();
    Swal.close();
    if (carrinhoLoteIA.length > 0) window.abrirResumoCarrinho();
}

window.verificarCaminhaoDestino = async function() {
    const destino = document.getElementById('modal-destino').value;
    if (!destino || carrinhoLoteIA.length === 0) return;

    const primeiraRaca = carrinhoLoteIA[0].raca.toLowerCase();
    const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
    const aves_e_medios = ['galinha', 'pato', 'peru', 'porco', 'ovelha', 'cabra'];

    let modelosAceitos = [];
    let nomeVeiculoMsg = '';

    if (peixes.includes(primeiraRaca)) {
        modelosAceitos = ['Caminhão Baú (Frios)'];
        nomeVeiculoMsg = 'Caminhão Baú (Frios)';
    } else if (aves_e_medios.includes(primeiraRaca)) {
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
        const res = await fetch(`/api/barracao/listar?fazenda_id=${destino}&t=${new Date().getTime()}`);
        const data = await res.json();

        if (data.sucesso) {
            const veiculosPossuidos = data.maquinas.filter(m => modelosAceitos.includes(m.modelo));
            const veiculosProntos = veiculosPossuidos.filter(m => m.combustivel >= 15 && m.saude >= 5);

            if (veiculosProntos.length > 0) {
                let capTotal = 0;
                veiculosProntos.forEach(v => {
                    if (v.modelo === 'Caminhão Baú (Frios)') capTotal += 200;
                    else if (v.modelo === 'Caminhão Boiadeiro') {
                        if(peixes.includes(primeiraRaca)) capTotal += 200;
                        else if(['porco', 'ovelha', 'cabra'].includes(primeiraRaca)) capTotal += 60;
                        else if(['galinha', 'pato', 'peru'].includes(primeiraRaca)) capTotal += 200;
                        else capTotal += 20;
                    } else if (v.modelo.includes('Caminhonete')) {
                        if(['porco', 'ovelha', 'cabra'].includes(primeiraRaca)) capTotal += 10;
                        else if(['galinha', 'pato', 'peru'].includes(primeiraRaca)) capTotal += 50;
                        else capTotal += 2;
                    }
                });

                checkbox.disabled = false;
                checkbox.checked = true;
                aviso.innerText = `✅ Frota Pronta: ${veiculosProntos.length} veículos (Capacidade: ${capTotal} cab.). Frete Grátis.`;
                aviso.style.color = '#4caf50';

                let veiculoIlustracao = veiculosProntos.find(v => v.modelo.includes('Caminhão')) || veiculosProntos[0];
                if(veiculoIlustracao.imagem) imgCaminhao.src = '/static/img/' + veiculoIlustracao.imagem;
            } else {
                checkbox.disabled = true;
                checkbox.checked = false;
                aviso.innerText = `❌ Sem ${nomeVeiculoMsg} disponível ou sem combustível. Frete será cobrado.`;
                aviso.style.color = '#f44336';
                definirCaminhaoPadrao(primeiraRaca); 
            }
        }
    } catch (e) {
        console.error(e);
    }
    window.atualizarTotalModal();
}

window.abrirModalLogisticaIA = function() {
    if (carrinhoLoteIA.length === 0) {
        Swal.fire('Atenção', 'Selecione pelo menos um animal no carrinho.', 'warning');
        return;
    }

    compraAtual = { tipo: 'ia_lote', carrinho: carrinhoLoteIA };
    let resumoTexto = carrinhoLoteIA.map(i => `${i.quantidade}x ${i.raca.capitalize()} (${i.fase}, ${i.sexo})`).join('<br>');
    document.getElementById('modal-animal-nome').innerHTML = resumoTexto;

    definirCaminhaoPadrao(carrinhoLoteIA[0].raca);
    document.getElementById('modal-logistica').style.display = 'flex';
    window.verificarCaminhaoDestino(); 
}

window.prepararCompraComunidade = function(id_anuncio, raca, valor) {
    compraAtual = { tipo: 'comunidade', id_anuncio: id_anuncio, precoUnitario: parseFloat(valor), raca: raca };
    document.getElementById('modal-animal-nome').innerText = `Lote Comunidade - ${raca.charAt(0).toUpperCase() + raca.slice(1)}`;
    
    definirCaminhaoPadrao(raca);
    document.getElementById('modal-logistica').style.display = 'flex';
    window.verificarCaminhaoDestino(); 
}

function definirCaminhaoPadrao(raca) {
    const racaLower = raca.toLowerCase();
    const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
    const aves_e_medios = ['galinha', 'pato', 'peru', 'porco', 'ovelha', 'cabra'];
    const imgCaminhao = document.getElementById('img-veiculo');
    
    if (peixes.includes(racaLower)) imgCaminhao.src = '/static/img/caminhao_bau.png';
    else if (aves_e_medios.includes(racaLower)) imgCaminhao.src = '/static/img/caminhonete_usada.png';
    else imgCaminhao.src = '/static/img/caminhao_boiadeiro.png';
}

window.fecharModal = function() {
    document.getElementById('modal-logistica').style.display = 'none';
    document.getElementById('modal-logistica').style.opacity = '1';
}

window.atualizarTotalModal = function() {
    const usaCaminhaoProprio = document.getElementById('check-caminhao-proprio').checked;
    let custoAnimais = 0;
    let qtdTotalCabecas = 0;
    let fretePorCabeca = 50.0;

    if (compraAtual.tipo === 'ia_lote') {
        compraAtual.carrinho.forEach(item => {
            custoAnimais += item.quantidade * item.precoUnitario;
            qtdTotalCabecas += item.quantidade;
        });

        const racaLower = compraAtual.carrinho[0].raca.toLowerCase();
        const aves = ['galinha', 'pato', 'peru'];
        const peixes = ['tambaqui', 'pirarucu', 'pacu', 'matrinxa', 'jaraqui', 'curimata', 'surubim', 'pintado', 'cachara', 'tucunare', 'piau'];
        const medios = ['porco', 'ovelha', 'cabra'];

        if (aves.includes(racaLower) || peixes.includes(racaLower)) fretePorCabeca = 5.0;
        else if (medios.includes(racaLower)) fretePorCabeca = 15.0;
    } else {
        qtdTotalCabecas = 1;
        custoAnimais = compraAtual.precoUnitario || 0;
    }
    
    if (usaCaminhaoProprio) fretePorCabeca = 0.0;
    
    const custoFrete = qtdTotalCabecas * fretePorCabeca;
    const total = custoAnimais + custoFrete;
    
    document.getElementById('modal-total-calc').innerHTML = `
        <div style="font-size: 12px; color: #aaa;">Animais: R$ ${custoAnimais.toLocaleString('pt-BR')} + Frete: R$ ${custoFrete.toLocaleString('pt-BR')}</div>
        <b style="color:#4caf50; font-size: 17px;">Total Geral: R$ ${total.toLocaleString('pt-BR')}</b>
    `;
}

window.confirmarCompra = function() {
    const destino = document.getElementById('modal-destino').value;
    const usaCaminhao = document.getElementById('check-caminhao-proprio').checked; 
    
    if(!destino) return Swal.fire('Atenção', 'Você precisa escolher uma propriedade de destino!', 'warning');
    document.getElementById('modal-logistica').style.opacity = '0.5';

    if (compraAtual.tipo === 'comunidade') {
        fetch('/api/mercado/comprar_leilao', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ anuncio_id: compraAtual.id_anuncio, fazenda_id: parseInt(destino), usa_caminhao: usaCaminhao })
        })
        .then(r => r.json()).then(tratarResposta).catch(tratarErro);
    } else if (compraAtual.tipo === 'ia_lote') {
        fetch('/api/mercado/comprar_lote_ia', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ destino_id: parseInt(destino), usa_caminhao: usaCaminhao, carrinho: compraAtual.carrinho })
        })
        .then(r => r.json()).then(tratarResposta).catch(tratarErro);
    }
}

function tratarResposta(d) {
    if (d.sucesso) {
        const imgSrc = document.getElementById('img-veiculo').src;
        Swal.fire({ title: 'Carga Despachada! ✅', text: d.msg, imageUrl: imgSrc, imageWidth: 140, background: '#2a2a2a', color: '#fff', confirmButtonColor: '#2e7d32', allowOutsideClick: false })
        .then(() => {
            carrinhoLoteIA = [];
            location.reload();
        });
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
};

if (!String.prototype.capitalize) {
    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }
}
