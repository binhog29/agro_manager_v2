// ==========================================
// MANEJO E EXPANSÃO DO CURRAL
// ==========================================
window.confirmarExpansaoCurral = function() {
    fetch('/api/fazenda/expandir_curral', { method: 'POST' })
    .then(r => r.json()).then(d => {
        if(d.sucesso) { 
            Swal.fire('Sucesso!', d.msg, 'success').then(()=> {
                localStorage.setItem('modal_aberto_fazenda', 'modal-curral');
                location.reload();
            }); 
        }
        else { Swal.fire('Erro', d.erro, 'error'); }
    });
};

window.aplicarManejo = function(animal_id, acao) {
    fetch('/api/animal/aplicar_insumo', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_id: animal_id, acao: acao })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) { 
            Swal.fire('Feito!', d.msg, 'success').then(()=> {
                localStorage.setItem('modal_aberto_fazenda', 'modal-curral');
                location.reload();
            }); 
        }
        else { Swal.fire('Atenção', d.erro, 'warning'); }
    });
};

window.abrirSelecaoVacinaLote = async function(tipoTratamento) {
    let tituloMap = {
        'aftosa': 'Vacinação contra Aftosa (Lote)',
        'brucelose': 'Vacinação contra Brucelose (Lote)',
        'medicamento': 'Aplicação de Medicamento Geral (Lote)'
    };

    const resposta = await fetch('/api/pecuaria/listar_curral');
    const dados = await resposta.json();

    if (!dados.animais || dados.animais.length === 0) {
        Swal.fire('Aviso', 'Nenhum animal no curral para tratar.', 'info');
        return;
    }

    let htmlCheckboxes = `
        <div style="text-align: left; max-height: 50vh; overflow-y: auto; padding: 5px;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <label style="cursor: pointer; font-size: 13px; color: #4caf50; font-weight: bold;">
                    <input type="checkbox" id="selecionar-todos-lote" onclick="toggleSelecionarTodos(this)"> Selecionar Todos
                </label>
                <span style="font-size: 11px; color: #aaa;">Total: ${dados.animais.length} animais</span>
            </div>
    `;

    dados.animais.forEach(a => {
        let jaTemTratamento = false;
        if (tipoTratamento === 'aftosa' && a.vacinado_aftosa) jaTemTratamento = true;
        if (tipoTratamento === 'brucelose' && a.vacinado_brucelose) jaTemTratamento = true;
        if (tipoTratamento === 'medicamento' && a.medicado) jaTemTratamento = true;

        const cAft = a.vacinado_aftosa ? '#2196f3' : '#444';
        const cBruc = a.vacinado_brucelose ? '#f44336' : '#444';
        const cMed = a.medicado ? '#9c27b0' : '#444';
        const cSup = a.suplementado ? '#4caf50' : '#444';

        let checkboxHtml = jaTemTratamento 
            ? `<i class="fas fa-check-circle" style="color: #4caf50; font-size: 18px; width: 18px; text-align: center; margin-right: 5px;" title="Já aplicado"></i>`
            : `<input type="checkbox" class="chk-animal-lote" value="${a.id}" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; margin-right: 5px;">`;

        let opacidade = jaTemTratamento ? 'opacity: 0.6;' : 'opacity: 1;';
        let pointer = jaTemTratamento ? 'cursor: not-allowed;' : 'cursor: pointer;';

        htmlCheckboxes += `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 10px; margin-bottom: 6px; border-radius: 6px; cursor: ${pointer}; border: 1px solid #444; ${opacidade}">
                <div style="display: flex; align-items: center; gap: 10px;">
                    ${checkboxHtml}
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase})</div>
                        <span style="font-size: 11px; color: #888;">ID: #${a.id} | Sexo: ${a.sexo} | Peso: ${a.peso}@</span>
                    </div>
                </div>
                <div style="display: flex; gap: 4px;">
                    <div style="width: 20px; height: 20px; background: ${cAft}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Aftosa">A</div>
                    <div style="width: 20px; height: 20px; background: ${cBruc}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Brucelose">B</div>
                    <div style="width: 20px; height: 20px; background: ${cMed}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Med. Geral">M</div>
                    <div style="width: 20px; height: 20px; background: ${cSup}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border-radius: 3px;" title="Suplemento">S</div>
                </div>
            </label>
        `;
    });
    htmlCheckboxes += `</div>`;

    Swal.fire({
        title: tituloMap[tipoTratamento], html: htmlCheckboxes, background: '#1a1a1a', color: '#fff',
        showCancelButton: true, confirmButtonText: 'Aplicar no Lote', cancelButtonText: 'Cancelar', confirmButtonColor: '#2e7d32',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-animal-lote:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) Swal.showValidationMessage('Selecione pelo menos um animal!');
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) executarTratamentoLote(result.value, tipoTratamento);
    });
};

window.toggleSelecionarTodos = function(masterCheckbox) {
    document.querySelectorAll('.chk-animal-lote').forEach(chk => chk.checked = masterCheckbox.checked);
};

window.executarTratamentoLote = function(animalIds, tipo) {
    Swal.fire({ title: 'Aplicando tratamento...', didOpen: () => Swal.showLoading() });
    fetch('/api/animal/tratamento_lote', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: animalIds, tipo: tipo })
    })
    .then(r => r.json()).then(res => {
        if (res.sucesso) {
            Swal.fire('Sucesso!', res.msg, 'success').then(() => { localStorage.setItem('modal_aberto_fazenda', 'modal-curral'); location.reload(); });
        } else Swal.fire('Atenção', res.erro, 'warning');
    }).catch(e => Swal.fire('Erro', 'Falha na comunicação.', 'error'));
};

window.prepararApartamento = async function(animal_id) {
    try {
        const response = await fetch('/api/pecuaria/listar_pastos_disponiveis');
        const data = await response.json();
        if (!data.pastos || data.pastos.length === 0) return Swal.fire('Atenção', 'Nenhum pasto formado disponível!', 'warning');

        let options = data.pastos.map(p => `<option value="${p.id}">${p.nome} (ID: ${p.id})</option>`).join('');
        const result = await Swal.fire({
            title: 'Apartar Animal', html: `<select id="pasto-select" class="swal2-select" style="display:flex; width: 100%; background: #111; color: #fff;">${options}</select>`,
            background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonText: '🚚 Enviar',
            preConfirm: () => document.getElementById('pasto-select').value
        });

        if (result.isConfirmed) {
            const res = await fetch('/api/animal/manejo_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: animal_id, destino: 'pasto_' + result.value })
            });
            const d = await res.json();
            if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => { localStorage.setItem('modal_aberto_fazenda', 'modal-curral'); location.reload(); });
            else Swal.fire('Erro', d.erro, 'error');
        }
    } catch (e) { Swal.fire('Erro', 'Falha ao buscar pastos.', 'error'); }
};

// ==========================================
// MÓDULO DE VENDAS E GRÁFICO (CARRINHO DE COMPRAS E FRIGORÍFICO)
// ==========================================
window.atualizarTotalLeilao = function() {
    const qtd = parseInt(document.getElementById('swal-qtd').value) || 0;
    const preco = parseFloat(document.getElementById('swal-preco').value) || 0;
    document.getElementById('txt-total-leilao').innerText = (qtd * preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

window.atualizarTotalFrigorifico = function() {
    const raca = document.getElementById('swal-raca-frig').value.toLowerCase(); 
    const qtd = parseInt(document.getElementById('swal-qtd-frig').value) || 0;
    const txtTotal = document.getElementById('txt-total-frig');
    
    if (!raca || qtd <= 0) {
        txtTotal.innerText = "R$ 0,00";
        return;
    }
    
    txtTotal.innerText = "Pesando o gado...";
    const fazendaId = window.location.pathname.split('/').pop();
    
    fetch('/api/animal/estimar_frigorifico', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ raca: raca, quantidade: qtd, fazenda_id: fazendaId })
    })
    .then(r => r.json()).then(d => {
        if(d.sucesso) {
            if(d.encontrados === 0) {
                txtTotal.innerHTML = `<span style="font-size:14px; color:#f44336;">Nenhum no curral</span>`;
            } else {
                let avisoQtd = d.encontrados < qtd ? `<br><span style="font-size:11px; color:#ff9800;">(Apenas ${d.encontrados} encontrados)</span>` : "";
                let avisoMercado = `<span style="font-size:12px; color:#aaa;">Índice Mercado: <b style="color:${d.fator >= 1 ? '#4caf50' : '#f44336'}">${Math.round(d.fator * 100)}%</b></span><br>`;
                txtTotal.innerHTML = avisoMercado + d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + avisoQtd;
            }
        } else txtTotal.innerText = "R$ 0,00";
    }).catch(() => { txtTotal.innerText = "Erro ao pesar"; });
};

window.prepararVendaComercial = function(id, peso, raca) { abrirVendaLeilao(id, raca); }; 

window.abrirVendaLeilao = function(id_animal, raca) {
    fecharModal('modal-curral');
    Swal.fire({
        title: 'Anunciar no Leilão',
        html: `
            <div style="text-align: center; margin-top: 10px;">
                <img src="/static/img/${raca.toLowerCase()}.png" style="width: 80px; margin-bottom: 10px;" onerror="this.src='/static/img/nelore.png'">
                <p style="color: #ccc; font-size: 14px;">Por qual valor deseja vender este <b>${raca}</b> para a comunidade?</p>
                <input type="number" id="valor_leilao_individual" class="swal2-input" placeholder="R$ 0,00" min="1" style="width: 100%; max-width: 250px;">
            </div>
        `,
        background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#e65100',
        cancelButtonColor: '#555', confirmButtonText: '💰 Anunciar', cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const valor = document.getElementById('valor_leilao_individual').value;
            if (!valor || valor <= 0) return Swal.showValidationMessage('Por favor, informe um valor válido.');
            return valor;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/mercado/anunciar', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: id_animal, valor: parseFloat(result.value) })
            }).then(res => res.json()).then(d => {
                if(d.sucesso) Swal.fire({title: 'No Ar! 📢', text: d.msg, icon: 'success', background: '#2a2a2a', color: '#fff', confirmButtonColor: '#2e7d32'}).then(() => { localStorage.setItem('modal_aberto_fazenda', 'modal-curral'); location.reload(); });
                else Swal.fire({title: 'Erro', text: d.erro, icon: 'error', background: '#2a2a2a', color: '#fff', confirmButtonColor: '#f44336'});
            });
        }
    });
}

window.prepararVendaLoteCurral = function() {
    fecharModal('modal-curral');
    Swal.fire({
        title: 'Comercializar Lote', text: 'Qual será o destino desses animais?',
        icon: 'question', background: '#2a2a2a', color: '#fff', showDenyButton: true, showCancelButton: true,
        confirmButtonText: '<i class="fas fa-gavel"></i> Leilão', denyButtonText: '<i class="fas fa-industry"></i> Frigorífico', customClass: { actions: 'botoes-lote-vertical' }
    }).then((r) => {
        if (r.isConfirmed) abrirModalLoteLeilao();
        else if (r.isDenied) abrirModalLoteFrigorifico();
    });
}

window.abrirModalLoteLeilao = function() {
    Swal.fire({
        title: 'Anunciar no Leilão',
        html: `
            <select id="swal-raca" class="swal2-input" style="background:#111; color:#fff; border:1px solid #444; width:85%; margin:10px auto; display:block;">
                <option value="" disabled selected>Raça...</option>
                <option value="nelore">Nelore</option><option value="angus">Angus</option><option value="girolando">Girolando</option><option value="cavalo">Cavalo</option>
            </select>
            <div style="display:flex; justify-content:center; gap:10px; width:85%; margin:10px auto;">
                <input id="swal-qtd" type="number" class="swal2-input" placeholder="Qtd" min="1" value="1" style="width:45%; margin:0;" oninput="atualizarTotalLeilao()">
                <input id="swal-preco" type="number" class="swal2-input" placeholder="R$ Unit" min="1" value="3500" style="width:50%; margin:0;" oninput="atualizarTotalLeilao()">
            </div>
            <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:15px; width:85%; margin:0 auto;">
                <div style="font-size:14px; color:#aaa;">Total do Lote</div>
                <div style="font-size:22px; font-weight:bold; color:#ff9800;" id="txt-total-leilao">R$ 3.500,00</div>
            </div>
        `,
        background: '#2a2a2a', color: '#fff', confirmButtonColor: '#ff9800', confirmButtonText: 'Anunciar', showCancelButton: true,
        preConfirm: () => {
            const raca = document.getElementById('swal-raca').value;
            const qtd = document.getElementById('swal-qtd').value;
            const preco = document.getElementById('swal-preco').value;
            if(!raca || !qtd || !preco) Swal.showValidationMessage('Preencha os valores!');
            return { raca, quantidade: qtd, preco, fazendaId: window.location.pathname.split('/').pop() };
        }
    }).then((r) => {
        if(r.isConfirmed) {
            fetch('/api/mercado/anunciar', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: 0, raca: r.value.raca, quantidade: r.value.quantidade, valor: r.value.preco, fazenda_id: r.value.fazendaId })
            }).then(res => res.json()).then(d => {
                if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(()=> { localStorage.setItem('modal_aberto_fazenda', 'modal-curral'); location.reload(); });
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
}

window.abrirModalLoteFrigorifico = function() {
    Swal.fire({
        title: 'Vender ao Frigorífico',
        html: `
            <select id="swal-raca-frig" class="swal2-input" onchange="atualizarTotalFrigorifico()" style="background:#111; color:#fff; border:1px solid #444; width:85%; margin:10px auto; display:block;">
                <option value="" disabled selected>Raça...</option>
                <option value="nelore">Nelore</option><option value="angus">Angus</option><option value="girolando">Girolando</option>
                <option value="guzera">Guzerá</option><option value="brahman">Brahman</option><option value="cavalo">Cavalo</option>
                <option value="ovelha">Ovelha</option><option value="porco">Porco (Chiqueiro)</option><option value="galinha">Galinha</option>
            </select>
            <input id="swal-qtd-frig" type="number" class="swal2-input" placeholder="Qtd" min="1" value="1" style="background:#111; color:#fff; border:1px solid #444; width:85%; margin:10px auto; display:block;" oninput="atualizarTotalFrigorifico()">
            
            <div style="text-align: right; width: 85%; margin: 0 auto 5px;">
                <a href="#" onclick="abrirGraficoCotacao(); return false;" style="color: #64b5f6; font-size: 12px; text-decoration: none;"><i class="fas fa-chart-line"></i> Gráfico de Cotação da Raça</a>
            </div>

            <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:5px; width:85%; margin-left:auto; margin-right:auto;">
                <div style="font-size:13px; color:#aaa;">Balança do Frigorífico (Pesagem Real)</div>
                <div style="font-size:20px; font-weight:bold;">Total Estimado: <b style="color:#4caf50;" id="txt-total-frig">R$ 0,00</b></div>
            </div>
        `,
        background: '#2a2a2a', color: '#fff', confirmButtonColor: '#b91c1c', confirmButtonText: 'Vender Lote', showCancelButton: true,
        preConfirm: () => {
            const raca = document.getElementById('swal-raca-frig').value;
            const qtd = document.getElementById('swal-qtd-frig').value;
            if(!raca || !qtd || qtd < 1) Swal.showValidationMessage('Preencha os valores!');
            return { raca, quantidade: qtd, fazenda_id: window.location.pathname.split('/').pop() };
        }
    }).then((r) => {
        if(r.isConfirmed) {
            fetch('/api/animal/vender_lote_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(r.value)
            }).then(res => res.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido!', d.msg, 'success').then(()=> { localStorage.setItem('modal_aberto_fazenda', 'modal-curral'); location.reload(); });
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
}

// ==========================================
// GRÁFICO DINÂMICO DE COTAÇÕES COM CHART.JS
// ==========================================
window.abrirGraficoCotacao = function() {
    const raca = document.getElementById('swal-raca-frig').value;
    if(!raca) {
        Swal.showValidationMessage('Selecione uma raça primeiro para ver o gráfico!');
        return;
    }
    
    Swal.fire({ title: 'Buscando Cotações...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    
    fetch('/api/mercado/dados_grafico', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ raca: raca })
    })
    .then(r => r.json()).then(dados => {
        if(dados.sucesso) {
            // Injeta o Chart.js na hora, para não pesar o carregamento inicial da página!
            if (typeof Chart === 'undefined') {
                let script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                document.head.appendChild(script);
                script.onload = () => renderizarGrafico(dados);
            } else {
                renderizarGrafico(dados);
            }
        } else {
            Swal.fire('Erro', 'Não foi possível carregar as cotações.', 'error');
        }
    });
}

function renderizarGrafico(dados) {
    let corTendencia = dados.fator_atual >= 1.0 ? '#4caf50' : '#f44336';
    let iconeTendencia = dados.fator_atual >= 1.0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
    let msgMercado = dados.fator_atual >= 1.0 ? "Mercado em Alta!" : "Mercado em Baixa!";
    
    Swal.fire({
        title: `Cotação do ${dados.raca}`,
        html: `
            <div style="margin-bottom: 10px; font-size: 15px; color: ${corTendencia}; font-weight: bold;">
                <i class="fas ${iconeTendencia}"></i> ${msgMercado} (${Math.round(dados.fator_atual * 100)}%)
            </div>
            <div style="width: 100%; height: 250px; background: #111; padding: 10px; border-radius: 8px;">
                <canvas id="graficoCanvas"></canvas>
            </div>
        `,
        background: '#2a2a2a', color: '#fff',
        showConfirmButton: true, confirmButtonText: '<i class="fas fa-undo"></i> Voltar ao Frigorífico',
        confirmButtonColor: '#2e7d32',
        didOpen: () => {
            const ctx = document.getElementById('graficoCanvas').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dados.labels,
                    datasets: [{
                        label: `Preço por ${dados.unidade}`,
                        data: dados.valores,
                        borderColor: '#ff9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.2)',
                        borderWidth: 3,
                        pointBackgroundColor: '#ff9800',
                        pointRadius: 5,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: '#ccc' }, grid: { color: '#444' } },
                        x: { ticks: { color: '#ccc' }, grid: { color: '#444' } }
                    }
                }
            });
        }
    }).then(() => {
        abrirModalLoteFrigorifico();
        setTimeout(() => {
            const select = document.getElementById('swal-raca-frig');
            if(select) {
                select.value = dados.raca.toLowerCase();
                atualizarTotalFrigorifico();
            }
        }, 100);
    });
}
