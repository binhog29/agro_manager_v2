// ==========================================
// MANEJO E EXPANSÃO DO CURRAL
// ==========================================
window.confirmarExpansaoCurral = function() {
    fetch('/api/fazenda/expandir_curral', { method: 'POST' })
    .then(r => r.json()).then(d => {
        if(d.sucesso) { Swal.fire('Sucesso!', d.msg, 'success').then(()=>location.reload()); }
        else { Swal.fire('Erro', d.erro, 'error'); }
    });
};

window.aplicarManejo = function(animal_id, acao) {
    fetch('/api/animal/aplicar_insumo', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_id: animal_id, acao: acao })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) { Swal.fire('Feito!', d.msg, 'success').then(()=>location.reload()); }
        else { Swal.fire('Atenção', d.erro, 'warning'); }
    });
};

// ==========================================
// VACINAÇÃO/TRATAMENTO EM LOTE NO CURRAL
// ==========================================
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
        // Verifica se o animal JÁ POSSUI o tratamento atual
        let jaTemTratamento = false;
        if (tipoTratamento === 'aftosa' && a.vacinado_aftosa) jaTemTratamento = true;
        if (tipoTratamento === 'brucelose' && a.vacinado_brucelose) jaTemTratamento = true;
        if (tipoTratamento === 'medicamento' && a.medicado) jaTemTratamento = true;

        // Cores dos ícones de saúde
        const cAft = a.vacinado_aftosa ? '#2196f3' : '#444';
        const cBruc = a.vacinado_brucelose ? '#f44336' : '#444';
        const cMed = a.medicado ? '#9c27b0' : '#444';
        const cSup = a.suplementado ? '#4caf50' : '#444';

        // Se já tem, mostra um checkmark em vez da caixinha clicável
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
                
                <!-- MOSTRAR AS BADGES VISUAIS (A B M S) IGUAL NA TELA PRINCIPAL -->
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
        title: tituloMap[tipoTratamento],
        html: htmlCheckboxes,
        background: '#1a1a1a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonText: 'Aplicar no Lote',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2e7d32',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-animal-lote:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) {
                Swal.showValidationMessage('Selecione pelo menos um animal!');
            }
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            executarTratamentoLote(result.value, tipoTratamento);
        }
    });
};

window.toggleSelecionarTodos = function(masterCheckbox) {
    // Como a caixinha só é criada para os animais não vacinados, o "Selecionar Todos" vai marcar exatamente os corretos!
    const checkboxes = document.querySelectorAll('.chk-animal-lote');
    checkboxes.forEach(chk => chk.checked = masterCheckbox.checked);
};

window.executarTratamentoLote = function(animalIds, tipo) {
    Swal.fire({ title: 'Aplicando tratamento...', didOpen: () => Swal.showLoading() });

    fetch('/api/animal/tratamento_lote', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: animalIds, tipo: tipo })
    })
    .then(r => r.json())
    .then(res => {
        if (res.sucesso) {
            Swal.fire('Sucesso!', res.msg, 'success').then(() => location.reload());
        } else {
            Swal.fire('Atenção', res.erro, 'warning');
        }
    })
    .catch(e => {
        console.error(e);
        Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    });
};

window.prepararApartamento = async function(animal_id) {
    try {
        const response = await fetch('/api/pecuaria/listar_pastos_disponiveis');
        const data = await response.json();

        if (!data.pastos || data.pastos.length === 0) {
            Swal.fire('Atenção', 'Nenhum pasto formado disponível!', 'warning');
            return;
        }

        let options = data.pastos.map(p => `<option value="${p.id}">${p.nome} (ID: ${p.id})</option>`).join('');

        const result = await Swal.fire({
            title: 'Apartar Animal',
            html: `<select id="pasto-select" class="swal2-select" style="display:flex; width: 100%; background: #111; color: #fff;">${options}</select>`,
            background: '#2a2a2a', color: '#fff',
            showCancelButton: true, confirmButtonText: '🚚 Enviar',
            preConfirm: () => document.getElementById('pasto-select').value
        });

        if (result.isConfirmed) {
            const res = await fetch('/api/animal/manejo_curral', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: animal_id, destino: 'pasto_' + result.value })
            });
            const d = await res.json();
            if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
            else Swal.fire('Erro', d.erro, 'error');
        }
    } catch (e) {
        console.error("Erro no Apartar:", e);
        Swal.fire('Erro', 'Falha ao buscar pastos.', 'error');
    }
};

// ==========================================
// CALCULADORAS DE LOTE EM TEMPO REAL E VENDAS
// ==========================================
window.atualizarTotalLeilao = function() {
    const qtd = parseInt(document.getElementById('swal-qtd').value) || 0;
    const preco = parseFloat(document.getElementById('swal-preco').value) || 0;
    document.getElementById('txt-total-leilao').innerText = (qtd * preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

window.atualizarTotalFrigorifico = function() {
    const racaSelect = document.getElementById('swal-raca-frig');
    const raca = racaSelect.value.toLowerCase(); 
    const qtd = parseInt(document.getElementById('swal-qtd-frig').value) || 0;
    
    if (!raca || !window.PRECOS_BASE[raca]) {
        document.getElementById('txt-total-frig').innerText = "R$ 0,00";
        return;
    }
    
    const precoAdulto = window.PRECOS_BASE[raca]['adulto'];
    const total = qtd * (precoAdulto * 0.85); 
    
    document.getElementById('txt-total-frig').innerText = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

window.prepararVendaComercial = function(id, peso, raca) { abrirVendaLeilao(id, raca); }; 

window.abrirVendaLeilao = function(id_animal, raca) {
    fecharModal('modal-curral');
    
    Swal.fire({
        title: 'Anunciar no Leilão',
        html: `
            <div style="text-align: center; margin-top: 10px;">
                <img src="/static/img/${raca.toLowerCase()}.png" style="width: 80px; margin-bottom: 10px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));" onerror="this.src='/static/img/nelore.png'">
                <p style="color: #ccc; font-size: 14px;">Por qual valor deseja vender este <b>${raca}</b> para a comunidade?</p>
                <input type="number" id="valor_leilao_individual" class="swal2-input" placeholder="R$ 0,00" min="1" style="width: 100%; max-width: 250px;">
            </div>
        `,
        background: '#2a2a2a', color: '#fff', showCancelButton: true, confirmButtonColor: '#e65100',
        cancelButtonColor: '#555', confirmButtonText: '💰 Anunciar', cancelButtonText: 'Cancelar',
        preConfirm: () => {
            const valor = document.getElementById('valor_leilao_individual').value;
            if (!valor || valor <= 0) {
                Swal.showValidationMessage('Por favor, informe um valor válido maior que zero.');
                return false;
            }
            return valor;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/api/mercado/anunciar', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: id_animal, valor: parseFloat(result.value) })
            })
            .then(res => res.json())
            .then(d => {
                if(d.sucesso) {
                    Swal.fire({title: 'No Ar! 📢', text: d.msg, icon: 'success', background: '#2a2a2a', color: '#fff', confirmButtonColor: '#2e7d32'}).then(() => location.reload());
                } else {
                    Swal.fire({title: 'Erro', text: d.erro, icon: 'error', background: '#2a2a2a', color: '#fff', confirmButtonColor: '#f44336'});
                }
            })
            .catch(e => Swal.fire({title: 'Erro de Conexão', text: 'Falha no servidor.', icon: 'warning', background: '#2a2a2a', color: '#fff', confirmButtonColor: '#ff9800'}));
        }
    });
}

window.prepararVendaLoteCurral = function() {
    fecharModal('modal-curral');
    Swal.fire({
        title: 'Comercializar Lote', text: 'Qual será o destino desses animais?',
        icon: 'question', background: '#2a2a2a', color: '#fff', showDenyButton: true, showCancelButton: true,
        confirmButtonText: '<i class="fas fa-gavel"></i> Leilão', denyButtonText: '<i class="fas fa-industry"></i> Frigorífico',
        customClass: { actions: 'botoes-lote-vertical' }
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
                <option value="nelore">Nelore</option>
                <option value="angus">Angus</option>
                <option value="girolando">Girolando</option>
                <option value="guzera">Guzerá</option>
                <option value="brahman">Brahman</option>
                <option value="cavalo">Cavalo</option>
            </select>
            <div style="display:flex; justify-content:center; gap:10px; width:85%; margin:10px auto;">
                <input id="swal-qtd" type="number" class="swal2-input" placeholder="Qtd" min="1" value="1" style="background:#111; color:#fff; border:1px solid #444; width:45%; margin:0;" oninput="atualizarTotalLeilao()">
                <input id="swal-preco" type="number" class="swal2-input" placeholder="R$ Unit" min="1" value="3500" style="background:#111; color:#fff; border:1px solid #444; width:50%; margin:0;" oninput="atualizarTotalLeilao()">
            </div>
            <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:15px; width:85%; margin-left:auto; margin-right:auto;">
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
            const fazendaId = window.location.pathname.split('/').pop();
            return { raca, quantidade: qtd, preco, fazendaId };
        }
    }).then((r) => {
        if(r.isConfirmed) {
            fetch('/api/mercado/anunciar', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_id: 0, raca: r.value.raca, quantidade: r.value.quantidade, valor: r.value.preco, fazenda_id: r.value.fazendaId })
            }).then(res => res.json()).then(d => {
                if(d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(()=>location.reload());
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
                <option value="nelore">Nelore</option>
                <option value="angus">Angus</option>
                <option value="girolando">Girolando</option>
                <option value="guzera">Guzerá</option>
                <option value="brahman">Brahman</option>
                <option value="cavalo">Cavalo</option>
                <option value="ovelha">Ovelha</option>
                <option value="porco">Porco (Chiqueiro)</option>
            </select>
            <input id="swal-qtd-frig" type="number" class="swal2-input" placeholder="Qtd" min="1" value="1" style="background:#111; color:#fff; border:1px solid #444; width:85%; margin:10px auto; display:block;" oninput="atualizarTotalFrigorifico()">
            <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:15px; width:85%; margin-left:auto; margin-right:auto;">
                <div style="font-size:13px; color:#aaa;">Cotação Frigorífico (85% do Mercado)</div>
                <div style="font-size:20px; font-weight:bold;">Est. Total: <b style="color:#4caf50;" id="txt-total-frig">R$ 0,00</b></div>
            </div>
        `,
        background: '#2a2a2a', color: '#fff', confirmButtonColor: '#b91c1c', confirmButtonText: 'Vender', showCancelButton: true,
        preConfirm: () => {
            const raca = document.getElementById('swal-raca-frig').value;
            const qtd = document.getElementById('swal-qtd-frig').value;
            if(!raca || !qtd || qtd < 1) Swal.showValidationMessage('Preencha os valores!');
            const fazendaId = window.location.pathname.split('/').pop();
            return { raca, quantidade: qtd, fazenda_id: fazendaId };
        }
    }).then((r) => {
        if(r.isConfirmed) {
            fetch('/api/animal/vender_lote_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(r.value)
            }).then(res => res.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido!', d.msg, 'success').then(()=>location.reload());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
}
