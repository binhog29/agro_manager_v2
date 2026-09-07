window.abrirGerenciamentoCultivo = async function(loteId, status, tipoCultivo, tipoFazenda) {
    
    let area = 1;
    if (tipoFazenda === 'Sítio') area = 5;
    else if (tipoFazenda === 'Fazenda') area = 15;
    else if (tipoFazenda === 'Latifúndio') area = 30;

    const precosBase = {
        'soja': 650, 'milho': 500, 'arroz': 480, 'feijao': 550, 'cana': 600, 'tomate': 115, 'mandioca': 250,
        'cafe': 650, 'cacau': 750, 'acai': 600, 'cupuacu': 550, 'banana': 300, 'abacaxi': 350, 'pimenta': 400, 'melancia': 150
    };

    if (status === 'arado' || status === 'coveado') {
        let tituloMenu = status === 'arado' ? ` 🌱 Loja de Sementes (${area} ha)` : ` 🌳 Viveiro de Mudas (${area} ha)`;
        
        let botoesHTML = '';
        if (status === 'arado') {
            botoesHTML = `
                <button class="swal2-styled btn-plantio" style="background: #fbc02d; color: #000;" onclick="plantarSemente(${loteId}, 'soja', '${tipoCultivo}')">🌾 Soja (R$ ${(precosBase['soja']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #ff9800; color: #fff;" onclick="plantarSemente(${loteId}, 'milho', '${tipoCultivo}')">🌽 Milho (R$ ${(precosBase['milho']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #e0e0e0; color: #000;" onclick="plantarSemente(${loteId}, 'arroz', '${tipoCultivo}')">🍚 Arroz (R$ ${(precosBase['arroz']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #795548; color: #fff;" onclick="plantarSemente(${loteId}, 'feijao', '${tipoCultivo}')">🫘 Feijão (R$ ${(precosBase['feijao']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #81c784; color: #000;" onclick="plantarSemente(${loteId}, 'cana', '${tipoCultivo}')">🎋 Cana (R$ ${(precosBase['cana']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #e53935; color: #fff;" onclick="plantarSemente(${loteId}, 'tomate', '${tipoCultivo}')">🍅 Tomate (R$ ${(precosBase['tomate']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #d32f2f; color: #fff;" onclick="plantarSemente(${loteId}, 'mandioca', '${tipoCultivo}')">🥔 Mandioca (R$ ${(precosBase['mandioca']*area).toLocaleString('pt-BR')})</button>
            `;
        } else {
            botoesHTML = `
                <button class="swal2-styled btn-plantio" style="background: #4e342e; color: #fff;" onclick="plantarSemente(${loteId}, 'cafe', '${tipoCultivo}')">☕ Café Clonal (R$ ${(precosBase['cafe']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #3e2723; color: #fff;" onclick="plantarSemente(${loteId}, 'cacau', '${tipoCultivo}')">🍫 Cacau (R$ ${(precosBase['cacau']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #311b92; color: #fff;" onclick="plantarSemente(${loteId}, 'acai', '${tipoCultivo}')">🟣 Açaí (R$ ${(precosBase['acai']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #8d6e63; color: #fff;" onclick="plantarSemente(${loteId}, 'cupuacu', '${tipoCultivo}')">🍈 Cupuaçu (R$ ${(precosBase['cupuacu']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #fbc02d; color: #000;" onclick="plantarSemente(${loteId}, 'banana', '${tipoCultivo}')">🍌 Banana (R$ ${(precosBase['banana']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #cddc39; color: #000;" onclick="plantarSemente(${loteId}, 'abacaxi', '${tipoCultivo}')">🍍 Abacaxi (R$ ${(precosBase['abacaxi']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #d32f2f; color: #fff;" onclick="plantarSemente(${loteId}, 'pimenta', '${tipoCultivo}')">🌶️ Pimenta (R$ ${(precosBase['pimenta']*area).toLocaleString('pt-BR')})</button>
                <button class="swal2-styled btn-plantio" style="background: #4caf50; color: #fff;" onclick="plantarSemente(${loteId}, 'melancia', '${tipoCultivo}')">🍉 Melancia (R$ ${(precosBase['melancia']*area).toLocaleString('pt-BR')})</button>
            `;
        }

                // O AVISO DE INFLAÇÃO!
        let avisoInflacao = `
            <div style="font-size: 11px; color: #ff9800; margin-bottom: 5px; margin-top: 15px; background: #222; padding: 10px; border-radius: 6px; border: 1px dashed #ff9800; text-align: left; line-height: 1.4;">
                <i class="fas fa-chart-line"></i> <b>Inflação Operacional:</b> Os preços acima são base. Custos de tratores e sementes sofrem ágio conforme o seu <b>Nível e Tamanho do Império</b>.
            </div>`;

        Swal.fire({
            title: tituloMenu,
            html: `
                <style>
                    .btn-plantio { margin: 0 !important; width: 100%; font-size: 13px !important; padding: 12px 10px !important; font-weight: bold; border: 1px solid #222 !important; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
                </style>
                <div style="margin-bottom: 15px; color: #aaa; font-size: 13px;">O solo está preparado. O que deseja plantar?</div>
                
                <div style="width: 100%; height: 90px; background: repeating-linear-gradient(180deg, #1e110a 0px, #331d12 8px, #4a2b1b 16px, #331d12 24px, #1e110a 32px); border: 2px solid #27140f; border-radius: 8px; margin-bottom: 15px; box-shadow: inset 0 0 20px rgba(0,0,0,0.8);"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${botoesHTML}
                </div>
                
                ${avisoInflacao}
                
                <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
                <button class="swal2-styled" style="background: #c62828; width: 100%; margin: 0;" onclick="reverterParaMato(${loteId})"><i class="fas fa-undo"></i> Abandonar Terra</button>
            `,
            background: '#1a1a1a', color: '#fff', width: '90%',
            showConfirmButton: false, showCloseButton: true, allowOutsideClick: false
        });
    } 
    else if (status === 'plantado' || status === 'colhendo' || status === 'colheita_incompleta') {
        Swal.fire({ title: 'Avaliando lavoura...', didOpen: () => Swal.showLoading() });
        const resposta = await fetch(`/api/cultivo/detalhes?lote_id=${loteId}`);
        const dados = await resposta.json();
        if (!dados.sucesso) return Swal.fire('Erro', 'Falha ao ler dados da terra.', 'error');

        const statusReal = dados.status;
        let areaLote = dados.area; 
        let pctPronto = dados.progresso_pct || 0;
        let estagio = dados.estagio || '';
        let culturaNome = dados.tipo_cultivo ? dados.tipo_cultivo.toLowerCase() : '';

        let estiloBotao = `background: #444; color: #888; cursor: not-allowed;`;
        let textoBotao = `<i class="fas fa-clock"></i> Crescendo...`;
        let botaoDesativado = true;

        if (statusReal === 'plantado') {
            if (estagio === 'Ponto de Colheita') {
                estiloBotao = `background: #2e7d32; color: #fff; cursor: pointer; border: 1px solid #1b5e20; box-shadow: 0 0 10px rgba(46,125,50,0.5);`;
                textoBotao = `<i class="fas fa-tractor"></i> Iniciar Colheita`;
                botaoDesativado = false;
            } else {
                estiloBotao = `background: linear-gradient(90deg, #2e7d32 ${pctPronto}%, #333333 ${pctPronto}%); color: white; cursor: not-allowed; border: 1px solid #555;`;
                if (estagio.includes('Aguardando')) textoBotao = `🕒 ${estagio}`;
                else textoBotao = `🕒 ${estagio} (Faltam ${dados.dias_restantes || '?'} dias)`;
                botaoDesativado = true;
            }
        } else if (statusReal === 'colhendo') {
            estiloBotao = `background: #fbc02d; color: #000; cursor: pointer; border: 1px solid #c89600; box-shadow: 0 0 10px rgba(251,192,45,0.5);`;
            textoBotao = `<i class="fas fa-tractor"></i> Avançar Colheita`;
            botaoDesativado = false;
        } else if (statusReal === 'colheita_incompleta') {
            estiloBotao = `background: #ff9800; color: #000; cursor: pointer; border: 1px solid #e65100; box-shadow: 0 0 10px rgba(255,152,0,0.5);`;
            textoBotao = `<i class="fas fa-exclamation-triangle"></i> Retomar Colheita`;
            botaoDesativado = false;
        }

        let temIrrigacao = (dados.sistema_irrigacao !== 'nenhum' && dados.sistema_irrigacao);
        let botaoIrrigacao = temIrrigacao 
            ? `<button class="swal2-styled btn-painel-lav" style="background: #4caf50; grid-column: span 2; opacity: 0.5; cursor: default;" disabled><i class="fas fa-check-circle"></i> Irrigação Ativa</button>`
            : `<button class="swal2-styled btn-painel-lav" style="background: #0288d1; grid-column: span 2;" onclick="instalarIrrigacao(${loteId})"><i class="fas fa-tint"></i> Instalar Pivô (R$ ${(5000*areaLote).toLocaleString('pt-BR')})</button>`;

        Swal.fire({
            title: `Lote ${loteId} (${areaLote} ha)`,
            html: `
                <style>
                    .btn-painel-lav { margin: 0 !important; font-size: 12px !important; padding: 12px 5px !important; font-weight: bold; text-transform: uppercase; }
                    /* Balanço realista de planta presa na terra */
                    @keyframes ventoPlanta {
                        0% { transform: rotate(0deg); }
                        40% { transform: rotate(-3deg); }
                        80% { transform: rotate(2deg); }
                        100% { transform: rotate(0deg); }
                    }
                    .pe-planta {
                        transform-origin: bottom center;
                        animation: ventoPlanta 3.5s infinite ease-in-out;
                    }
                    @keyframes gotejo {
                        0% { transform: translateY(-5px); opacity: 0; }
                        30% { opacity: 0.8; }
                        100% { transform: translateY(160px); opacity: 0; }
                    }
                    .gota-irrigacao {
                        position: absolute;
                        top: 15px;
                        width: 2px;
                        height: 6px;
                        background: #4fc3f7;
                        border-radius: 2px;
                        animation: gotejo 1.1s infinite linear;
                    }
                </style>

                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; font-weight: bold;">
                    <span style="color: #fbc02d; text-transform: capitalize;">🌾 ${culturaNome}</span>
                    <span style="color: ${dados.produtividade > 70 ? '#4caf50' : '#f44336'};">Saúde: ${Math.round(dados.produtividade)}%</span>
                </div>
                
                <!-- 🔥 SOLO COM RELEVOS DE LEIRAS AGRÍCOLAS 🔥 -->
                <div id="lavoura-2d-container" style="width: 100%; height: 210px; background: repeating-linear-gradient(180deg, #1c0f08 0px, #2e1a0f 10px, #422515 22px, #2e1a0f 34px, #1c0f08 44px); border: 3px solid #1a0b05; border-radius: 8px; position: relative; overflow: hidden; margin-bottom: 15px; box-shadow: inset 0 0 30px rgba(0,0,0,0.95);">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 15px; background: #222; padding: 10px; border-radius: 6px; font-size: 11px;">
                    <div style="color: #aaa;">Solo/Adubo: <b style="color: ${dados.fertilidade > 50 ? '#4caf50' : '#f44336'};">${Math.round(dados.fertilidade)}%</b></div>
                    <div style="color: #aaa;">Infestação: <b style="color: ${dados.pragas < 30 ? '#4caf50' : '#f44336'};">${Math.round(dados.pragas)}%</b></div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="swal2-styled btn-painel-lav" style="background: #795548;" onclick="manejoLavoura(${loteId}, 'adubar')">
                        <i class="fas fa-poop"></i> Adubar <br><span style="font-size:9px; opacity:0.8; text-transform:none;">Gasta ${areaLote} (Tem ${dados.est_adubo})</span>
                    </button>
                    <button class="swal2-styled btn-painel-lav" style="background: #e53935;" onclick="manejoLavoura(${loteId}, 'pulverizar')">
                        <i class="fas fa-helicopter"></i> Pulverizar <br><span style="font-size:9px; opacity:0.8; text-transform:none;">Gasta ${areaLote} (Tem ${dados.est_veneno})</span>
                    </button>
                    
                    ${botaoIrrigacao}
                    
                    <button class="swal2-styled btn-painel-lav" style="${estiloBotao} grid-column: span 2; padding: 15px 5px !important; font-size: 14px !important;" ${botaoDesativado ? 'disabled' : `onclick="colherLavoura(${loteId})"`}>
                        ${textoBotao}
                    </button>

                    <button class="swal2-styled btn-painel-lav" style="background: transparent; border: 1px solid #c62828; color: #c62828; grid-column: span 2; margin-top: 10px !important;" onclick="destruirLavoura(${loteId})">
                        <i class="fas fa-tractor"></i> Passar Trator (Destruir Safra)
                    </button>
                </div>
            `,
            background: '#1a1a1a', color: '#fff', width: '95%',
            showConfirmButton: false, showCloseButton: true, allowOutsideClick: false,
            didOpen: () => { iniciarAnimacaoLavoura(culturaNome, pctPronto, estagio, temIrrigacao); }
        });
    }
};

// ==========================================
// 🌿 GERADOR DE PÉS DE PLANTA REALISTAS (SVG)
// ==========================================
function renderizarPeDePlantaSVG(cultura, pct) {
    // 1. MONTÍCULO DE TERRA NA BASE (sempre presente na raiz)
    let terraBase = `
        <ellipse cx="16" cy="40" rx="9" ry="3" fill="#130804" opacity="0.9" />
        <ellipse cx="16" cy="39" rx="6" ry="1.8" fill="#2d170c" />
    `;

    // 2. FASE 1: Semente / Brotando (0% a 15%)
    if (pct < 15) {
        return `
            <svg viewBox="0 0 32 44" width="28" height="38" style="overflow: visible;">
                ${terraBase}
                <path d="M16 39 Q16 34 17 32" stroke="#8bc34a" stroke-width="2" stroke-linecap="round" fill="none" />
                <circle cx="17" cy="31" r="1.8" fill="#aed581" />
            </svg>
        `;
    }

    // 3. FASE 2: Broto com Caule e Primeiras Folhas (15% a 45%)
    if (pct < 45) {
        return `
            <svg viewBox="0 0 32 44" width="30" height="40" style="overflow: visible;">
                ${terraBase}
                <!-- Caule central ereto saindo do montículo -->
                <path d="M16 39 L16 22" stroke="#388e3c" stroke-width="2.5" stroke-linecap="round" fill="none" />
                <!-- Folha esquerda brotando do caule -->
                <path d="M16 30 Q10 27 8 23 Q14 22 16 28" fill="#66bb6a" stroke="#2e7d32" stroke-width="0.5" />
                <!-- Folha direita brotando do caule -->
                <path d="M16 28 Q22 25 24 21 Q18 20 16 26" fill="#66bb6a" stroke="#2e7d32" stroke-width="0.5" />
                <!-- Folhinha do topo -->
                <path d="M16 23 Q14 17 16 16 Q18 17 16 23" fill="#81c784" />
            </svg>
        `;
    }

    // Cor e forma do fruto no estágio maduro
    let frutosSVG = '';
    if (pct >= 85) {
        if (cultura === 'tomate' || cultura === 'pimenta') {
            frutosSVG = `
                <circle cx="10" cy="22" r="3.5" fill="#e53935" stroke="#b71c1c" stroke-width="0.5" />
                <circle cx="21" cy="20" r="3.5" fill="#e53935" stroke="#b71c1c" stroke-width="0.5" />
                <circle cx="15" cy="14" r="3" fill="#d32f2f" />
            `;
        } else if (cultura === 'milho') {
            frutosSVG = `
                <path d="M19 18 Q23 16 22 24 Q18 22 19 18" fill="#fbc02d" stroke="#f57f17" stroke-width="0.6"/>
                <path d="M12 22 Q9 20 10 27 Q14 25 13 22" fill="#fbc02d" stroke="#f57f17" stroke-width="0.6"/>
            `;
        } else if (cultura === 'cafe') {
            frutosSVG = `
                <circle cx="14" cy="24" r="2" fill="#b71c1c" />
                <circle cx="18" cy="23" r="2" fill="#d32f2f" />
                <circle cx="13" cy="17" r="2" fill="#b71c1c" />
                <circle cx="19" cy="16" r="2" fill="#c62828" />
            `;
        } else {
            // Demais culturas: sementes/espigas douradas
            frutosSVG = `
                <circle cx="11" cy="20" r="2.5" fill="#fbc02d" />
                <circle cx="21" cy="19" r="2.5" fill="#fbc02d" />
                <circle cx="16" cy="12" r="2.8" fill="#fdd835" />
            `;
        }
    }

    // 4. FASE 3 E 4: Pé Maduro Encorpado (Caule forte + ramos laterais)
    return `
        <svg viewBox="0 0 32 44" width="34" height="44" style="overflow: visible;">
            ${terraBase}
            <!-- Caule robusto enraizado -->
            <path d="M16 39 Q15 24 16 8" stroke="#2e7d32" stroke-width="3" stroke-linecap="round" fill="none" />
            <!-- Galhos inferiores -->
            <path d="M16 32 Q8 29 6 22 Q12 21 16 28" fill="#388e3c" stroke="#1b5e20" stroke-width="0.6" />
            <path d="M16 30 Q24 27 26 20 Q20 19 16 26" fill="#388e3c" stroke="#1b5e20" stroke-width="0.6" />
            <!-- Galhos intermediários -->
            <path d="M16 23 Q7 18 6 11 Q13 11 16 19" fill="#4caf50" stroke="#1b5e20" stroke-width="0.6" />
            <path d="M16 21 Q25 16 26 9 Q19 9 16 17" fill="#4caf50" stroke="#1b5e20" stroke-width="0.6" />
            <!-- Copa superior -->
            <path d="M16 13 Q12 6 13 2 Q17 6 16 12" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.5" />
            <path d="M16 13 Q20 6 19 2 Q15 6 16 12" fill="#66bb6a" stroke="#1b5e20" stroke-width="0.5" />
            ${frutosSVG}
        </svg>
    `;
}

// ==========================================
// 🚜 DISTRIBUIÇÃO ALINHADA ÀS LEIRAS DO SOLO
// ==========================================
window.iniciarAnimacaoLavoura = function(culturaNome, progressoPct, estagio, temIrrigacao) {
    const container = document.getElementById('lavoura-2d-container');
    if (!container) return;

    let cenarioHtml = '';
    
    // 4 fileiras de canteiros (posicionadas nas fendas escuras do relevo)
    const fileirasY = [28, 72, 116, 160]; 
    const plantasPorLinha = 7;

    fileirasY.forEach((posY, idxLinha) => {
        for(let col = 1; col <= plantasPorLinha; col++) {
            // Leve variação para não parecer régua mecânica
            let jitterX = (Math.random() * 4) - 2;
            let posX = (col * 12.5) - 4 + jitterX; 
            let delayVento = Math.random() * 2.5;

            cenarioHtml += `
                <div class="pe-planta" style="position: absolute; left: ${posX}%; top: ${posY}px; z-index: ${idxLinha + 2}; animation-delay: ${delayVento}s;">
                    ${renderizarPeDePlantaSVG(culturaNome, progressoPct)}
                </div>
            `;
        }
    });

    // 💧 PIVÔ CENTRAL DE IRRIGAÇÃO
    if (temIrrigacao) {
        cenarioHtml += `
            <div style="position: absolute; top: 12px; left: -5%; width: 110%; height: 5px; background: linear-gradient(to bottom, #cfd8dc, #78909c); border-bottom: 1px solid #37474f; z-index: 50; box-shadow: 0 4px 10px rgba(0,0,0,0.7);"></div>
            <div style="position: absolute; top: 12px; left: 20%; width: 3px; height: 190px; background: #546e7a; z-index: 49;"></div>
            <div style="position: absolute; top: 12px; left: 80%; width: 3px; height: 190px; background: #546e7a; z-index: 49;"></div>
        `;
        for(let i = 0; i < 25; i++) {
            let delayGota = Math.random() * 1.5;
            let posX = Math.random() * 95;
            cenarioHtml += `<div class="gota-irrigacao" style="left: ${posX}%; animation-delay: ${delayGota}s;"></div>`;
        }
    }

    container.innerHTML = cenarioHtml;
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

window.destruirLavoura = function(loteId) {
    Swal.fire({
        title: 'Passar o Trator?',
        text: "Isso vai destruir toda a plantação atual e devolver a terra limpa. Custa R$ 300 de aluguel da máquina.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sim, destruir!',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Limpando terra...', didOpen: () => Swal.showLoading() });
            fetch('/api/fazenda/reverter_cultivo', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ lote_id: loteId })
            })
            .then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
};
