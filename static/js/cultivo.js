window.abrirGerenciamentoCultivo = async function(loteId, status, tipoCultivo, tipoFazenda) {
    
    // 🔥 Puxa a Área da Fazenda
    let area = 1;
    if (tipoFazenda === 'Sítio') area = 5;
    else if (tipoFazenda === 'Fazenda') area = 15;
    else if (tipoFazenda === 'Latifúndio') area = 30;

    // 🔥 Dicionário com os preços base do arquivo Python
    const precosBase = {
        'soja': 650, 'milho': 500, 'arroz': 480, 'feijao': 550, 'cana': 600, 'tomate': 115, 'mandioca': 250,
        'cafe': 650, 'cacau': 750, 'acai': 600, 'cupuacu': 550, 'banana': 300, 'abacaxi': 350, 'pimenta': 400, 'melancia': 150
    };

    if (status === 'arado' || status === 'coveado') {
        let tituloMenu = status === 'arado' ? `Sementes (${area} ha)` : `Mudas (${area} ha)`;
        let botoesHTML = '';

        if (status === 'arado') {
            botoesHTML = `
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'soja', '${tipoCultivo}')">Soja (R$ ${(precosBase['soja']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #ff9800; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'milho', '${tipoCultivo}')">Milho (R$ ${(precosBase['milho']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #e0e0e0; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'arroz', '${tipoCultivo}')">Arroz (R$ ${(precosBase['arroz']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #795548; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'feijao', '${tipoCultivo}')">Feijão (R$ ${(precosBase['feijao']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #81c784; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cana', '${tipoCultivo}')">Cana (R$ ${(precosBase['cana']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #e53935; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'tomate', '${tipoCultivo}')">Tomate (R$ ${(precosBase['tomate']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #d32f2f; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'mandioca', '${tipoCultivo}')">Mandioca (R$ ${(precosBase['mandioca']*area).toLocaleString('pt-BR')})</button>
            `;
        } else {
            botoesHTML = `
                <button class="swal2-styled" style="background: #4e342e; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cafe', '${tipoCultivo}')">Café Clonal (R$ ${(precosBase['cafe']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #3e2723; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cacau', '${tipoCultivo}')">Cacau (R$ ${(precosBase['cacau']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #311b92; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'acai', '${tipoCultivo}')">Açaí (R$ ${(precosBase['acai']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #8d6e63; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'cupuacu', '${tipoCultivo}')">Cupuaçu (R$ ${(precosBase['cupuacu']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #fbc02d; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'banana', '${tipoCultivo}')">Banana (R$ ${(precosBase['banana']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #cddc39; color: #000; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'abacaxi', '${tipoCultivo}')">Abacaxi (R$ ${(precosBase['abacaxi']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #d32f2f; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'pimenta', '${tipoCultivo}')">Pimenta (R$ ${(precosBase['pimenta']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled" style="background: #4caf50; color: #fff; width: 100%; margin-bottom: 5px;" onclick="plantarSemente(${loteId}, 'melancia', '${tipoCultivo}')">Melancia (R$ ${(precosBase['melancia']*area).toLocaleString('pt-BR')})</button>
            `;
        }

        Swal.fire({
            title: tituloMenu,
            html: `
                <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 15px;">
                    ${botoesHTML}
                    <hr style="border: 0; border-top: 1px solid #444; margin: 10px 0;">
                    <button class="swal2-styled" style="background: #555; width: 100%;" onclick="reverterParaMato(${loteId})"><i class="fas fa-undo"></i> Abandonar Terra</button>
                </div>
            `,
            background: '#2a2a2a', color: '#fff',
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Fechar'
        });
    } 
    else if (status === 'plantado' || status === 'colhendo' || status === 'colheita_incompleta') {
        Swal.fire({ title: 'Analisando Lavoura...', didOpen: () => Swal.showLoading() });
        const resposta = await fetch(`/api/cultivo/detalhes?lote_id=${loteId}`);
        const dados = await resposta.json();
        if (!dados.sucesso) return Swal.fire('Erro', 'Falha ao ler dados da terra.', 'error');

        const statusReal = dados.status;
        let areaLote = dados.area; // Puxa do Python
        let estiloBotao = `background: #444; color: #888; cursor: not-allowed;`;
        let textoBotao = `<i class="fas fa-clock"></i> Crescendo...`;
        let botaoDesativado = true;

        if (statusReal === 'plantado') {
            if (dados.estagio === 'Ponto de Colheita') {
                estiloBotao = `background: #2e7d32; color: #fff; cursor: pointer; border: 1px solid #1b5e20; box-shadow: 0 0 10px rgba(46,125,50,0.5);`;
                textoBotao = `<i class="fas fa-tractor"></i> Colher Safra`;
                botaoDesativado = false;
            } else {
                estiloBotao = `background: linear-gradient(90deg, #2e7d32 ${dados.progresso_pct}%, #333333 ${dados.progresso_pct}%); color: white; cursor: not-allowed; border: 1px solid #555;`;
                if (dados.estagio.includes('Aguardando')) {
                    textoBotao = `🕒 ${dados.estagio}`;
                } else {
                    textoBotao = `🕒 ${dados.estagio} (Faltam ${dados.dias_restantes} dias)`;
                }
                botaoDesativado = true;
            }
        } else if (statusReal === 'colhendo') {
            estiloBotao = `background: #fbc02d; color: #000; cursor: pointer; border: 1px solid #c89600;`;
            textoBotao = `<i class="fas fa-tractor"></i> Contratar Colheita`;
            botaoDesativado = false;
        } else if (statusReal === 'colheita_incompleta') {
            estiloBotao = `background: #ff9800; color: #000; cursor: pointer; border: 1px solid #e65100; box-shadow: 0 0 10px rgba(255,152,0,0.5);`;
            textoBotao = `<i class="fas fa-exclamation-triangle"></i> Retomar Colheita`;
            botaoDesativado = false;
        }

        let botaoIrrigacao = '';
        if (dados.sistema_irrigacao === 'nenhum' || !dados.sistema_irrigacao) {
            botaoIrrigacao = `<button class="swal2-styled" style="background: #0288d1; margin: 0; margin-top: 5px; grid-column: span 2; font-weight: bold;" onclick="instalarIrrigacao(${loteId})">
                <i class="fas fa-tint"></i> Instalar Pivô (R$ ${(5000*areaLote).toLocaleString('pt-BR')})
            </button>`;
        } else {
            botaoIrrigacao = `<button class="swal2-styled" style="background: #4caf50; margin: 0; margin-top: 5px; grid-column: span 2; font-weight: bold; opacity: 0.7; cursor: default;" disabled>
                <i class="fas fa-check-circle"></i> Irrigação Ativa
            </button>`;
        }

        Swal.fire({
            title: `Lavoura (${areaLote} ha)`,
            html: `
                <div style="text-align: left; margin-bottom: 15px; background: #222; padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Produtividade:</span>
                        <strong style="color: ${dados.produtividade > 70 ? '#4caf50' : '#f44336'};">${Math.round(dados.produtividade)}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #aaa;">Solo:</span>
                        <strong style="color: ${dados.fertilidade > 50 ? '#4caf50' : '#f44336'};">${Math.round(dados.fertilidade)}%</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #aaa;">Pragas:</span>
                        <strong style="color: ${dados.pragas < 30 ? '#4caf50' : '#f44336'};">${Math.round(dados.pragas)}%</strong>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button class="swal2-styled" style="background: #795548; margin: 0; font-size: 11px; font-weight: bold; padding: 5px;" onclick="manejoLavoura(${loteId}, 'adubar')">
                        <i class="fas fa-poop"></i> Adubar<br><span style="font-size:9px; font-weight:normal;">(Gasta ${areaLote} | Tem ${dados.est_adubo})</span>
                    </button>
                    <button class="swal2-styled" style="background: #e53935; margin: 0; font-size: 11px; font-weight: bold; padding: 5px;" onclick="manejoLavoura(${loteId}, 'pulverizar')">
                        <i class="fas fa-helicopter"></i> Pulverizar<br><span style="font-size:9px; font-weight:normal;">(Gasta ${areaLote} | Tem ${dados.est_veneno})</span>
                    </button>
                    
                    <button class="swal2-styled" style="${estiloBotao} margin: 0; grid-column: span 2; font-weight: bold;" ${botaoDesativado ? 'disabled' : `onclick="colherLavoura(${loteId})"`}>
                        ${textoBotao}
                    </button>

                    ${botaoIrrigacao}

                    <button class="swal2-styled" style="background: #c62828; color: #fff; margin: 0; margin-top: 5px; grid-column: span 2; font-weight: bold;" onclick="destruirLavoura(${loteId})">
                        <i class="fas fa-tractor"></i> Passar Trator (Destruir - R$ 300)
                    </button>
                </div>
            `,
            background: '#2a2a2a', color: '#fff',
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Fechar'
        });
    }
};

window.plantarSemente = function(loteId, tipoEscolhido, tipoAnterior) {
    if (tipoAnterior && tipoAnterior === tipoEscolhido) {
        Swal.fire({
            title: '⚠️ Monocultura!',
            text: `Você colheu ${tipoAnterior} recentemente. Plantar a mesma semente limitará a produtividade a 80%. Deseja continuar?`,
            icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sim, plantar', cancelButtonText: 'Escolher outra', background: '#2a2a2a', color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) executarPlantioFinal(loteId, tipoEscolhido);
        });
    } else {
        executarPlantioFinal(loteId, tipoEscolhido);
    }
};

function executarPlantioFinal(loteId, tipo) {
    Swal.fire({ title: 'Plantando...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/plantar', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lote_id: loteId, tipo_cultivo: tipo })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
}

window.manejoLavoura = function(loteId, acao_manejo) {
    Swal.fire({ title: 'Aplicando...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/manejo', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lote_id: loteId, acao: acao_manejo })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.colherLavoura = function(loteId) {
    Swal.fire({ title: 'Colhendo...', didOpen: () => Swal.showLoading() });
    fetch('/api/cultivo/colher', {
        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lote_id: loteId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Finalizado!', d.msg, 'success').then(() => location.reload());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.reverterParaMato = function(loteId) {
    Swal.fire({ title: 'Abandonar?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sim' }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/cultivo/abandonar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lote_id: loteId }) })
            .then(r => r.json()).then(d => { if(d.sucesso) location.reload(); });
        }
    });
};

window.instalarIrrigacao = function(loteId) {
    Swal.fire({ title: 'Instalar Pivô?', icon: 'question', showCancelButton: true, confirmButtonText: 'Sim' }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/cultivo/comprar_irrigacao', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ lote_id: loteId }) })
            .then(r => r.json()).then(d => { if(d.sucesso) location.reload(); else Swal.fire('Erro', d.erro, 'error'); });
        }
    });
};

window.carregarStatusDinamico = async function() {
    const labels = document.querySelectorAll('[id^="label-status-"]');
    for (let label of labels) {
        if (label.getAttribute('data-status') === 'plantado') {
            const loteId = label.id.replace('label-status-', '');
            try {
                const r = await fetch(`/api/cultivo/detalhes?lote_id=${loteId}`);
                const d = await r.json();
                if (d.sucesso) {
                    label.innerHTML = d.estagio === 'Ponto de Colheita' ? '<span style="color: #4caf50;">✅ Ponto de Colheita</span>' : `<span style="color: #fbc02d;">⏳ Crescendo (${d.progresso_pct}%)</span>`;
                }
            } catch(e) {}
        }
    }
};
setTimeout(carregarStatusDinamico, 300);
