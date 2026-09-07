// ==========================================
// CONTROLADOR DE HABITATS (Aves, Suínos e Peixes)
// ==========================================
window.construir = function(tipo, custo) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    Swal.fire({
        title: `Construir ${tipo.toUpperCase()}`,
        text: `Esta obra vai custar R$ ${custo.toLocaleString('pt-BR')}. Confirma?`,
        icon: 'question', background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#2e7d32', confirmButtonText: 'Construir'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            fetch('/api/fazenda/construir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ tipo: tipo, custo: custo, fazenda_id: fazendaId }) 
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Pronto!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};



window.abrirModalHabitat = async function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Abrindo instalações...', didOpen: () => Swal.showLoading() });
    
    const response = await fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`);
    const data = await response.json();
    if(!data.sucesso && data.erro) { Swal.fire('Erro', data.erro, 'error'); return; }

    // 🎨 CORES E TÍTULOS DOS HABITATS
    let titulo, bgStyle, custoExpansao;
    if (habitat === 'galinheiro') {
        titulo = '🐔 Galinheiro (Avicultura)'; bgStyle = 'background: #e6c280; box-shadow: inset 0 0 20px rgba(139, 69, 19, 0.5); border: 3px solid #8b4513;'; custoExpansao = 8000;
    } else if (habitat === 'chiqueiro') {
        titulo = '🐖 Chiqueiro (Suinocultura)'; bgStyle = 'background: #795548; box-shadow: inset 0 0 20px rgba(62, 39, 35, 0.8); border: 3px solid #4e342e;'; custoExpansao = 25000;
    } else if (habitat === 'represa') {
        titulo = '🐟 Represa (Piscicultura)'; bgStyle = 'background: radial-gradient(circle, #0288d1 0%, #01579b 100%); box-shadow: inset 0 0 20px rgba(0,0,0,0.6); border: 3px solid #1a237e;'; custoExpansao = 8000;
    } else if (habitat === 'haras') {
        titulo = '🐎 Haras (Equinocultura)'; 
        // Pista de terra batida/areia para cavalos
        bgStyle = 'background: #8d6e63; box-shadow: inset 0 0 25px rgba(40, 20, 10, 0.9); border: 3px solid #3e2723;'; 
        custoExpansao = 35000;
    } else if (habitat === 'aprisco') {
        titulo = '🐑 Aprisco (Ovinos e Caprinos)'; 
        // EXATAMENTE O MESMO VERDE E TEXTURA DO PASTO!
        bgStyle = 'background: #2e7d32; box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.7); border: 3px solid #1b5e20;'; 
        custoExpansao = 15000;
    }

    let infoRacao = data.tem_comedouro ? `✅ Ração (${Math.round(data.qtd_racao || 0)} un)` : `❌ Sem Comedouro`;
    let animaisPrenhos = (data.animais || []).filter(a => a.prenha);
    let animaisLivres = (data.animais || []).filter(a => !a.prenha);
    
    let animaisHtml = '';
    const desenharCard = (a) => {
        const corSaude = a.saude > 70 ? '#4caf50' : (a.saude > 30 ? '#ff9800' : '#f44336');
        const corFome = a.fome < 30 ? '#4caf50' : (a.fome < 70 ? '#ff9800' : '#f44336');
        let tagReproducao = '';

        // 🔥 CORREÇÃO: Pega os dias e adiciona na tag rosa do Plantel Principal!
        let dias = Math.round(a.dias_prenhez || a.dias_gestacao || 0);

        if (a.prenha) {
            if (habitat === 'galinheiro') {
                tagReproducao = `<span style="background:#e91e63; color:white; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:bold; margin-left:5px;"><i class="fas fa-egg"></i> CHOCANDO (${dias}d)</span>`;
            } else {
                tagReproducao = `<span style="background:#e91e63; color:white; font-size:9px; padding:2px 5px; border-radius:4px; font-weight:bold; margin-left:5px;"><i class="fas fa-heart"></i> PRENHA (${dias}d)</span>`;
            }
        }
        
        return `
            <div style="background:#222; border:1px solid #444; border-radius:6px; padding:8px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center; border-left: 3px solid #555;">
                <div>
                    <div style="font-weight:bold; font-size:13px; color:#fff; text-transform: capitalize;">${a.raca} (${a.fase}) ${tagReproducao}</div>
                    <div style="font-size:10px; color:#888;">ID: #${a.id} | Sexo: <b>${a.sexo || 'M'}</b> | Peso: ${a.peso.toFixed(1)} Kg</div>
                </div>
                <div style="text-align: right; font-size: 10px; color: #ccc;">
                    <div><i class="fas fa-heart" style="color:${corSaude};"></i> Saúde: ${a.saude.toFixed(1)}%</div>
                    <div><i class="fas fa-drumstick-bite" style="color:${corFome};"></i> Fome: ${a.fome.toFixed(1)}%</div>
                </div>
            </div>
        `;
    };

    if(animaisPrenhos.length > 0) {
        animaisHtml += `<div style="color:#e91e63; font-size:11px; font-weight:bold; margin-bottom:5px;">MATERNIDADE</div>`;
        animaisPrenhos.forEach(a => animaisHtml += desenharCard(a));
    }
    if(animaisLivres.length > 0) {
        animaisHtml += `<div style="color:#aaa; font-size:11px; font-weight:bold; margin-top:10px; margin-bottom:5px;">PLANTEL</div>`;
        animaisLivres.forEach(a => animaisHtml += desenharCard(a));
    }

    Swal.fire({
        title: titulo,
        html: `
            <style>
                .btn-painel { margin: 0 !important; font-size: 11px !important; padding: 10px 5px !important; font-weight: bold; }
                @keyframes objCaminha { 0% {transform: translateY(0);} 50% {transform: translateY(-4px);} 100% {transform: translateY(0);} }
                @keyframes objBalança { 0% {transform: rotate(0deg);} 25% {transform: rotate(-4deg);} 75% {transform: rotate(4deg);} 100% {transform: rotate(0deg);} }
                .anim-pulo { animation: objCaminha 0.3s infinite; }
                .anim-trote { animation: objCaminha 0.6s infinite ease-in-out; }
                .anim-gingado { animation: objBalança 1s infinite linear; }
            </style>

            <div style="text-align: left; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #ccc;">
                    <span>📦 Lotação: ${data.animais ? data.animais.length : 0} / ${data.capacidade}</span>
                    <span>🛠️ ${infoRacao}</span>
                </div>

                <!-- 🔥 PALCO PRINCIPAL 2D 🔥 -->
                <div id="habitat-2d-${habitat}" style="width: 100%; height: 220px; ${bgStyle} border-radius: 8px; position: relative; overflow: hidden; margin-bottom: 15px;"></div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px;">
                    <button class="swal2-styled btn-painel" style="background: #333; grid-column: span 2;" onclick="document.getElementById('lista-oculta-${habitat}').style.display = document.getElementById('lista-oculta-${habitat}').style.display === 'none' ? 'block' : 'none'">
                        <i class="fas fa-list"></i> Ver Relatório do Plantel (${data.animais ? data.animais.length : 0} un) <i class="fas fa-chevron-down"></i>
                    </button>
                    ${data.tem_comedouro ? `<button class="swal2-styled btn-painel" style="background: #ff9800;" onclick="reabastecerComedouroHabitat('${habitat}')"><i class="fas fa-cube"></i> Pôr Ração</button>` : `<button class="swal2-styled btn-painel" style="background: #f57c00;" onclick="construirComedouroHabitat('${habitat}')"><i class="fas fa-hammer"></i> Fazer Comedouro</button>`}
                    <button class="swal2-styled btn-painel" style="background: #2e7d32;" onclick="alimentarHabitat('${habitat}')"><i class="fas fa-utensils"></i> Alimentar Animais</button>
                    <button class="swal2-styled btn-painel" style="background: #1565c0;" onclick="expandirHabitat('${habitat}')"><i class="fas fa-plus"></i> Expandir Local</button>
                    <button class="swal2-styled btn-painel" style="background: #0288d1;" onclick="prepararTransferenciaLoteCurral('${habitat}')"><i class="fas fa-truck"></i> Transferir</button>
                    <button class="swal2-styled btn-painel" style="background: #c62828; grid-column: span 2;" onclick="abrirModalHabitatVenda('${habitat}', 'Animais')"><i class="fas fa-dollar-sign"></i> Comercializar</button>
                </div>
                <div id="lista-oculta-${habitat}" style="display: none; max-height: 25vh; overflow-y: auto; border-top: 1px solid #444; padding-top: 10px;">
                    ${animaisHtml || '<div style="text-align:center; padding:10px; color:#f44336;">Nenhum animal.</div>'}
                </div>
            </div>
        `,
        background: '#1a1a1a', color: '#fff', width: '95%', showConfirmButton: false, showCloseButton: true, allowOutsideClick: false,
        didOpen: () => { iniciarAnimacaoHabitat(habitat, data.animais || [], data.tem_comedouro); }
    });
};

window.iniciarAnimacaoHabitat = function(habitat, animais, temComedouro) {
    const container = document.getElementById(`habitat-2d-${habitat}`);
    if (!container) return;

    let cenariosHtml = '';
    // 🎨 DESENHA O CENÁRIO DE FUNDO
    if (habitat === 'galinheiro') {
        for(let i=0; i<12; i++) cenariosHtml += `<div style="position:absolute; left:${Math.random()*90}%; top:${Math.random()*85}%; font-size: 22px; opacity:0.75; filter: grayscale(0.2) sepia(0.8); z-index:1;">🪹</div>`;
    } else if (habitat === 'chiqueiro') {
        for(let i=0; i<8; i++) cenariosHtml += `<div style="position:absolute; left:${Math.random()*80}%; top:${Math.random()*80}%; width:${40+Math.random()*50}px; height:${20+Math.random()*30}px; background:#3e2723; border-radius:50%; opacity:0.7; z-index:1;"></div>`;
    } else if (habitat === 'represa') {
        for(let i=0; i<15; i++) cenariosHtml += `<div style="position:absolute; left:${Math.random()*90}%; top:${Math.random()*90}%; font-size: ${12+Math.random()*12}px; opacity:0.8; z-index:1;">🍃</div>`;
    } else if (habitat === 'aprisco') {
        // Tufinhos de grama idênticos aos do lote de pasto
        for(let i=0; i<18; i++) {
            cenariosHtml += `<div style="position:absolute; left:${Math.random()*90}%; top:${Math.random()*85}%; font-size: 14px; opacity:0.6; z-index:1;">🌱</div>`;
        }
    } else if (habitat === 'haras') {
        // Estacas de madeira da pista do Haras
        cenariosHtml += `<div style="position:absolute; top: 12px; left: 0; width: 100%; height: 4px; background: #d7ccc8; z-index: 1; opacity: 0.8;"></div>`;
        for(let i=0; i<12; i++) {
            cenariosHtml += `<div style="position:absolute; top: 6px; left: ${i*9}%; width: 6px; height: 18px; background: #d7ccc8; z-index: 1;"></div>`;
        }
    } // <--- CHAVE FECHADA CORRETAMENTE AQUI

    // 🛠️ DESENHA O COCHO
    if (temComedouro) {
        if (habitat === 'represa') {
            cenariosHtml += `<div style="position:absolute; bottom:10px; right:20px; width:45px; height:45px; background:#8d6e63; border:2px solid #4e342e; border-radius:50%; z-index:100; display:flex; align-items:center; justify-content:center;"><div style="width:25px; height:25px; background:#0288d1; border-radius:50%; border:2px solid #01579b;"></div></div>`;
        } else {
            // Cocho de madeira retangular padrão para aves, suínos, haras e aprisco
            cenariosHtml += `<div style="position:absolute; bottom:15px; right:20px; width:60px; height:20px; z-index:100;"><div style="position:absolute; bottom:0; left:0; width:60px; height:14px; background:#5d4037; border:2px solid #3e2723; border-radius:3px;"></div><div style="position:absolute; bottom:5px; left:4px; width:52px; height:6px; background:#fbc02d; border-radius:2px;"></div></div>`;
        }
    }

    container.innerHTML = cenariosHtml;

    // 🐾 COLOCA OS BICHOS PRA ANDAR
    animais.forEach((a, index) => {
        if (index >= 30) return; // Limite de tela para não travar
        let containerBicho = document.createElement('div');
        containerBicho.style.position = 'absolute';
        containerBicho.style.width = '35px';
        containerBicho.style.height = '35px';
        containerBicho.style.display = 'flex';
        containerBicho.style.alignItems = 'center';
        containerBicho.style.justifyContent = 'center';
        containerBicho.style.cursor = 'pointer';
        containerBicho.style.transition = habitat === 'represa' ? 'left 6s linear, top 6s linear' : 'left 3s linear, top 3s linear';
        
        let img = document.createElement('img');
        img.src = `/static/img/${a.raca.toLowerCase()}.png`;
        img.onerror = function() { this.src='/static/img/nelore.png'; };
        img.style.width = (habitat === 'haras') ? '150%' : '100%'; // Cavalo é desenhado um pouco maior
        img.style.pointerEvents = 'none';
        img.style.transition = 'transform 0.3s ease';

        containerBicho.appendChild(img);
        container.appendChild(containerBicho);

        let posX = 10 + Math.random() * 80;
        let posY = 10 + Math.random() * 80;
        containerBicho.style.left = posX + '%';
        containerBicho.style.top = posY + '%';
        containerBicho.style.zIndex = Math.round(posY) + 10; 

        containerBicho.onclick = () => Swal.fire({ title: `${a.raca.toUpperCase()} #${a.id}`, html: `Peso: <b>${a.peso.toFixed(1)} Kg</b> <br> Saúde: <b>${Math.round(a.saude)}%</b> | Fome: <b>${Math.round(a.fome || 0)}%</b>`, toast: true, position: 'top', showConfirmButton: false, timer: 3000, background: '#222', color: '#fff' });

        setInterval(() => {
            let novaPosX = 5 + Math.random() * 85;
            let novaPosY = 5 + Math.random() * 85;
            let direcaoFlip = novaPosX > posX ? 'scaleX(-1)' : 'scaleX(1)';
            img.style.transform = direcaoFlip;

            if (habitat === 'galinheiro') img.classList.add('anim-pulo');
            else if (habitat === 'haras' || habitat === 'aprisco') img.classList.add('anim-trote');
            else img.classList.add('anim-gingado');

            containerBicho.style.left = novaPosX + '%';
            containerBicho.style.top = novaPosY + '%';
            containerBicho.style.zIndex = Math.round(novaPosY) + 10;

            setTimeout(() => {
                img.className = ''; // Remove classes de animação ao parar
            }, habitat === 'represa' ? 6000 : 3000);
        }, habitat === 'represa' ? 7000 : (4000 + Math.random()*4000));
    });
}

window.expandirHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop();
    
    let aumento = 0;
    let custo = 0;
    
    // 🔥 TABELA DE PREÇOS ATUALIZADA: Modo Hardcore!
    if (habitat === 'represa') { aumento = 100; custo = 15000; }
    else if (habitat === 'chiqueiro') { aumento = 50; custo = 35000; }
    else if (habitat === 'galinheiro') { aumento = 100; custo = 12000; }
    else if (habitat === 'haras') { aumento = 5; custo = 80000; }
    else if (habitat === 'aprisco') { aumento = 15; custo = 40000; }
    else { return Swal.fire('Erro', 'Habitat inválido.', 'error'); }

    Swal.fire({
        title: `Ampliar ${habitat.toUpperCase()}`,
        text: `Aumentar a capacidade em +${aumento} vagas vai custar R$ ${custo.toLocaleString('pt-BR')}. Confirma?`,
        icon: 'question', background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonColor: '#1565c0', confirmButtonText: 'Expandir'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Ampliando obras...', didOpen: () => Swal.showLoading() });
            fetch('/api/habitat/expandir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId })
            }).then(r => r.json()).then(d => {
                if (d.sucesso) Swal.fire('Pronto!', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Atenção', d.erro, 'warning');
            });
        }
    });
};

window.carregarPainelComedouroHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`)
    .then(r => r.json())
    .then(d => {
        const painel = document.getElementById(`painel-comedouro-${habitat}`);
        if (!painel) return;

        if (d.tem_comedouro) {
            painel.innerHTML = `
                <div style="background: #1a1a1a; padding: 8px 10px; border-radius: 6px; border: 1px solid #444; text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Depósito de Ração: <b>${Math.round(d.qtd_racao)} / 200 un</b></div>
                    <button onclick="reabastecerComedouroHabitat('${habitat}')" style="width: 100%; background: #ff9800; color: #fff; border: none; padding: 6px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">
                        <i class="fas fa-cube"></i> Reabastecer Depósito
                    </button>
                </div>
            `;
        } else {
            let custo = habitat === 'represa' ? 800 : (habitat === 'chiqueiro' ? 1000 : 600);
            painel.innerHTML = `
                <button onclick="construirComedouroHabitat('${habitat}')" style="width: 100%; background: #f57c00; color: #fff; border: none; padding: 8px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; margin-bottom: 10px;">
                    <i class="fas fa-hammer"></i> Construir Depósito (R$ ${custo.toLocaleString('pt-BR')})
                </button>
            `;
        }
    });
};

window.construirComedouroHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Construindo depósito...', didOpen: () => Swal.showLoading() });
    fetch('/api/habitat/construir_comedouro', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) 
    }).then(r => r.json()).then(d => {
        if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.reabastecerComedouroHabitat = async function(habitat) {
    let tipoInsumoEscolhido = 'soja'; 
    const fazendaId = window.location.pathname.split('/').pop(); 
    
    if (habitat === 'chiqueiro') {
        const { value: insumo } = await Swal.fire({
            title: 'Escolha a Ração',
            input: 'select',
            inputOptions: { 'soja': 'Soja (do Silo)', 'milho': 'Milho (do Silo)' },
            inputPlaceholder: 'Selecione o grão',
            showCancelButton: true, confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar',
            background: '#2a2a2a', color: '#fff'
        });
        if (!insumo) return;
        tipoInsumoEscolhido = insumo;
    }

    let nomesInsumo = { 'represa': 'Ração de Peixe', 'chiqueiro': tipoInsumoEscolhido === 'milho' ? 'Milho (do Silo)' : 'Soja (do Silo)', 'galinheiro': 'Milho (do Silo)' };
    
    const { value: qtd } = await Swal.fire({
        title: `Abastecer com ${nomesInsumo[habitat]}`,
        input: 'number',
        inputLabel: 'Quantas unidades deseja colocar? (Máx: 200)',
        inputAttributes: { min: 1, max: 200, step: 1 },
        showCancelButton: true, confirmButtonText: 'Despejar', cancelButtonText: 'Cancelar', background: '#2a2a2a', color: '#fff'
    });

    if (qtd) {
        Swal.fire({ title: 'Abastecendo...', didOpen: () => Swal.showLoading() });
        fetch('/api/habitat/reabastecer', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ habitat: habitat, quantidade: parseInt(qtd), tipo_grao: tipoInsumoEscolhido, fazenda_id: fazendaId })
        }).then(r => r.json()).then(d => {
            if (d.sucesso) Swal.fire('Sucesso!', d.msg, 'success').then(() => carregarPainelComedouroHabitat(habitat));
            else Swal.fire('Atenção', d.erro, 'warning');
        });
    }
};

window.alimentarHabitat = function(habitat) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    Swal.fire({ title: 'Jogando ração...', didOpen: () => Swal.showLoading() });
    fetch('/api/pecuaria/alimentar_habitat', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ habitat: habitat, fazenda_id: fazendaId }) 
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Alimentados!', d.msg, 'success');
            carregarAnimaisHabitat(habitat); 
            carregarPainelComedouroHabitat(habitat);
        } else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.abrirModalRepresaVenda = function() {
    abrirModalHabitatVenda('represa', 'Peixes');
};

window.atualizarTotalVendaHabitat = function() {
    const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
    const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
    const txtTotal = document.getElementById('txt-total-venda-habitat');
    if (!txtTotal) return;
    if (ids.length === 0) { txtTotal.innerText = "R$ 0,00"; return; }
    
    txtTotal.innerText = "Calculando...";
    const fazendaId = window.location.pathname.split('/').pop(); 
    
    fetch('/api/animal/estimar_frigorifico', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ animal_ids: ids, fazenda_id: fazendaId }) 
    }).then(r => r.json()).then(d => {
        if(d.sucesso) txtTotal.innerHTML = '<span style="color:#4caf50;">' + d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '</span>';
        else txtTotal.innerText = "R$ 0,00";
    });
};

window.toggleSelecionarTodosHabitat = function(masterCheckbox, habitat) {
    document.querySelectorAll(`.chk-${habitat}`).forEach(chk => { chk.checked = masterCheckbox.checked; });
    atualizarTotalVendaHabitat();
};

window.abrirModalHabitatVenda = async function(habitat, nomeTipo) {
    const fazendaId = window.location.pathname.split('/').pop(); 
    const resposta = await fetch(`/api/pecuaria/habitat/${habitat}?fazenda_id=${fazendaId}`); 
    const dados = await resposta.json();

    if (!dados.animais || dados.animais.length === 0) {
        Swal.fire('Aviso', `Não há animais neste ${habitat} para comercializar.`, 'info');
        return;
    }

    let htmlCheckboxes = `
        <div style="text-align: left; max-height: 40vh; overflow-y: auto; padding: 5px;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <label style="cursor: pointer; font-size: 13px; color: #4caf50; font-weight: bold;">
                    <input type="checkbox" id="selecionar-todos-${habitat}" onclick="toggleSelecionarTodosHabitat(this, '${habitat}')"> Selecionar Todos
                </label>
                <span style="font-size: 11px; color: #aaa;">Total: ${dados.animais.length} ${nomeTipo}</span>
            </div>
    `;
    
    dados.animais.forEach(a => {
        // 🔥 Calcula os dias exatos arredondados
        let dias = Math.round(a.dias_prenhez || a.dias_gestacao || 0);

        let tagReproducao = '';
        if (a.prenha) {
            if (habitat === 'galinheiro') {
                tagReproducao = `<span style="background:#e91e63; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;"><i class="fas fa-egg"></i> CHOCANDO (${dias}d)</span>`;
            } else {
                // Serve para Chiqueiro, Aprisco e Haras automaticamente!
                tagReproducao = `<span style="background:#e91e63; color:white; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:8px; font-weight:bold;"><i class="fas fa-heart"></i> PRENHA (${dias}d)</span>`;
            }
        }

        htmlCheckboxes += `
            <label style="display: flex; align-items: center; justify-content: space-between; background: #222; padding: 10px; margin-bottom: 6px; border-radius: 6px; cursor: pointer; border: 1px solid #444;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" class="chk-habitat-item chk-${habitat}" value="${a.id}" onchange="atualizarTotalVendaHabitat()" style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0; margin-right: 5px;">
                    <div>
                        <div style="font-weight: bold; font-size: 14px; color: #fff; text-transform: capitalize;">${a.raca} (${a.fase}) ${tagReproducao}</div>
                        <span style="font-size: 11px; color: #888;">ID: #${a.id} | Sexo: <b>${a.sexo}</b> | Peso: ${a.peso.toFixed(1)} Kg | Fome: ${a.fome.toFixed(1)}%</span>
                    </div>
                </div>
            </label>
        `;
    });
    htmlCheckboxes += `</div>`;

    htmlCheckboxes += `
        <div style="background:#1a1a1a; border:1px dashed #444; border-radius:8px; padding:10px; margin-top:15px; width:100%; text-align:center;">
            <div style="font-size:14px; color:#aaa;">Valor Estimado da Venda</div>
            <div style="font-size:22px; font-weight:bold; color:#4caf50;" id="txt-total-venda-habitat">R$ 0,00</div>
        </div>
    `;

    Swal.fire({
        title: `Comercializar ${nomeTipo}`, html: htmlCheckboxes, background: '#2a2a2a', color: '#fff',
        showCancelButton: true, confirmButtonText: 'Vender Lote', cancelButtonText: 'Cancelar', confirmButtonColor: '#b91c1c',
        preConfirm: () => {
            const checkboxes = document.querySelectorAll('.chk-habitat-item:checked');
            const ids = Array.from(checkboxes).map(chk => parseInt(chk.value));
            if (ids.length === 0) Swal.showValidationMessage('Selecione pelo menos um animal!');
            return ids;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando venda...', didOpen: () => { Swal.showLoading(); } });
            fetch('/api/animal/vender_lote_curral', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ animal_ids: result.value, fazenda_id: window.location.pathname.split('/').pop() })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido! 💰', d.msg, 'success').then(() => location.reload());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};
