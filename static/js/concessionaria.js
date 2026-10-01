window.abrirConcessionaria = async function() {
    // Mostra um loading rápido enquanto busca os preços atualizados do Painel de Administração
    Swal.fire({
        title: 'A carregar concessionária...',
        background: '#121212',
        color: '#fff',
        didOpen: () => Swal.showLoading()
    });

    let precosDinamicos = {};
    try {
        const resPrecos = await fetch('/api/precos/lista');
        const dadosPrecos = await resPrecos.json();
        if (dadosPrecos.sucesso) {
            precosDinamicos = dadosPrecos.precos;
        }
    } catch (e) {
        console.error("Erro ao carregar preços do painel:", e);
    }

    const catalogo = [
        { id: 'trator_leve', chaveAdmin: 'maq_trator_leve', nome: 'Trator Leve', desc: '75 HP | Operações Básicas', precoBase: 85000, img: 'trator_leve.png', cor: '#f57c00' },
        { id: 'trator_pesado', chaveAdmin: 'maq_trator_pesado', nome: 'Trator Pesado', desc: '220 HP | Alta Potência', precoBase: 350000, img: 'trator_pesado.png', cor: '#d84315' },
        { id: 'trator_esteira', chaveAdmin: 'maq_trator_esteira', nome: 'Trator de Esteira', desc: '170 HP | Limpeza Pesada', precoBase: 450000, img: 'trator_esteira.png', cor: '#fbc02d' },
        { id: 'escavadeira', chaveAdmin: 'maq_escavadeira', nome: 'Escavadeira', desc: '140 HP | Obras', precoBase: 550000, img: 'escavadeira.png', cor: '#f9a825' },
        { id: 'colheitadeira', chaveAdmin: 'maq_colheitadeira', nome: 'Colheitadeira', desc: '320 HP | Safra de Grãos', precoBase: 850000, img: 'colheitadeira.png', cor: '#ffb300' },
        { id: 'pulverizador', chaveAdmin: 'maq_pulverizador', nome: 'Pulverizador', desc: '190 HP | Defensivos', precoBase: 420000, img: 'pulverizador.png', cor: '#0288d1' },
        { id: 'pulv_arrasto', chaveAdmin: 'maq_pulv_arrasto', nome: 'Pulv. de Arrasto', desc: 'Lento (Gasta horas do dia)', precoBase: 35000, img: 'pulv_arrasto.png', cor: '#0288d1' },
        { id: 'plantadeira', chaveAdmin: 'maq_plantadeira', nome: 'Plantadeira', desc: '120 HP | -80% no Plantio', precoBase: 150000, img: 'plantadeira.png', cor: '#4caf50' },
        { id: 'grade_aradora', chaveAdmin: 'maq_grade_aradora', nome: 'Grade Aradora', desc: '140 HP | -80% no Preparo de Solo', precoBase: 65000, img: 'grade_aradora.png', cor: '#8d6e63' },
        { id: 'caminhonete_usada', chaveAdmin: 'maq_caminhonete_usada', nome: 'Caminhonete Usada', desc: '110 HP | Frete de pequenos animais', precoBase: 45000, img: 'caminhonete_usada.png', cor: '#795548' },
        { id: 'caminhonete_nova', chaveAdmin: 'maq_caminhonete_nova', nome: 'Caminhonete Nova', desc: '160 HP | Frete de pequenos animais', precoBase: 180000, img: 'caminhonete_nova.png', cor: '#d32f2f' },
        { id: 'caminhao_boiadeiro', chaveAdmin: 'maq_caminhao_boiadeiro', nome: 'Caminhão Boiadeiro', desc: 'Zera o frete de Animais Pesados', precoBase: 250000, img: 'caminhao_boiadeiro.png', cor: '#2e7d32' },
        { id: 'caminhao_bau', chaveAdmin: 'maq_caminhao_bau', nome: 'Caminhão Baú (Frios)', desc: 'Zera o frete de Peixes', precoBase: 200000, img: 'caminhao_bau.png', cor: '#1565c0' },
        // 🛸 DRONE AGRÍCOLA DE PRECISÃO
        { id: 'drone_agricola', chaveAdmin: 'maq_drone_agricola', nome: 'Drone de Precisão', desc: 'Pulverização e adubação em massa via app', precoBase: 180000, img: 'drone.png', cor: '#00bcd4' },
        // 🛩️ AVIÃO AGRÍCOLA (COMPRA E ALUGUER)
        { id: 'aviao_agricola', chaveAdmin: 'maq_aviao_agricola', nome: 'Avião Agrícola EMB-202', desc: 'Pulverização total em alta velocidade +15% rendimento', precoBase: 2500000, img: 'aviao_agricola.png', cor: '#e91e63' },
        { id: 'aluguel_aviao', chaveAdmin: 'aluguel_aviao', nome: 'Pulverização Aérea (Por Voo)', desc: 'Serviço terceirizado pontual sem necessidade de avião/piloto', precoBase: 35000, img: 'aviao_agricola.png', cor: '#9c27b0', eAluguel: true },
        { id: 'aluguel_aviao_adubo', chaveAdmin: 'aluguel_aviao_adubo', nome: 'Aluguer Aéreo de Adubação', desc: 'Serviço aéreo com avião agrícola para adubação rápida da lavoura', precoBase: 45000, img: 'aviao_agricola.png', cor: '#0288d1', eAluguel: true }
    ];

    let htmlCards = '<div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 5px 10px 5px 5px; margin-top: 10px;">';

    catalogo.forEach(c => {
        let precoAtual = precosDinamicos[c.chaveAdmin] !== undefined ? precosDinamicos[c.chaveAdmin] : c.precoBase;
        const iconeBotao = c.eAluguel ? 'fa-plane-departure' : 'fa-cart-plus';
        const textoPreco = c.eAluguel ? `R$ ${precoAtual.toLocaleString('pt-BR')} / voo` : `R$ ${precoAtual.toLocaleString('pt-BR')}`;

        htmlCards += `
            <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 12px; display: flex; align-items: center; padding: 12px; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3); flex-shrink: 0;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: ${c.cor};"></div>
                <div style="background: #111; border-radius: 8px; padding: 5px; width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #2a2a2a; margin-left: 5px;">
                    <img src="/static/img/${c.img}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5));" onerror="this.src='/static/img/trator.png'">
                </div>
                <div style="flex: 1; text-align: left; padding-left: 12px;">
                    <h4 style="margin: 0 0 3px 0; color: #fff; font-size: 15px;">${c.nome}</h4>
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">${c.desc}</div>
                    <div style="color: #4caf50; font-weight: 900; font-size: 14px;">${textoPreco}</div>
                </div>
                <button onclick="comprarMaquina('${c.id}')" style="background: ${c.cor}; color: #fff; border: none; width: 45px; height: 45px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 0 rgba(0,0,0,0.4); transition: transform 0.1s;">
                    <i class="fas ${iconeBotao}"></i>
                </button>
            </div>
        `;
    });

    htmlCards += '</div>';

    Swal.fire({
        title: '<div style="display:flex; align-items:center; justify-content:center; gap:10px; font-weight: 900;"><i class="fas fa-store" style="color:#ffb300;"></i> Concessionária</div>',
        html: htmlCards,
        background: '#121212',
        color: '#fff',
        width: '95%',
        showConfirmButton: false,
        showCloseButton: true,
        showCancelButton: true,
        cancelButtonText: 'Sair da Loja',
        cancelButtonColor: '#444'
    }).then((r) => {
        if(r.dismiss === Swal.DismissReason.cancel) {
            return;
        }
    });
};

window.comprarMaquina = async function(chave) {
    // 🛩️ TRATAMENTO ESPECIAL PARA SERVIÇOS AÉREOS
    if (chave === 'aluguel_aviao' || chave === 'aluguel_aviao_adubo') {
        if (typeof dispararAviaoAgricola === 'function') {
            // Chama a tua função original passando a chave para tratar a animação e o envio correto
            dispararAviaoAgricola(true, chave);
        } else {
            Swal.fire('Aviso', 'Aceda ao painel de cultivos da fazenda para contratar o serviço aéreo.', 'info');
        }
        return;
    }

    const URLAtual = window.location.pathname;
    let fazendaId = null;

    if (URLAtual.includes('/fazenda/')) {
        fazendaId = URLAtual.split('/').pop();
    } else {
        // 🚜 COMPRA VIA MAPA GLOBAL: Procura as fazendas do jogador para selecionar o destino
        Swal.fire({ title: 'A procurar as suas propriedades...', didOpen: () => Swal.showLoading() });
        
        try {
            const res = await fetch('/api/mapa_global');
            const terras = await res.json();
            const minhasFazendas = terras.filter(t => t.e_minha);

            if (!minhasFazendas || minhasFazendas.length === 0) {
                Swal.fire('Aviso', 'Precisa de ter pelo menos uma fazenda para entregar o equipamento!', 'warning');
                return;
            }

            let options = minhasFazendas.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');

            const { value: selectedFazenda } = await Swal.fire({
                title: 'Entregar em qual Fazenda?',
                html: `
                    <p style="color: #aaa; font-size: 13px;">Selecione a propriedade de destino para o novo equipamento:</p>
                    <select id="swal-fazenda-destino" class="swal2-select" style="width: 85%; background: #111; color: #fff; font-size: 14px; padding: 8px;">
                        ${options}
                    </select>
                `,
                background: '#2a2a2a', color: '#fff',
                showCancelButton: true,
                confirmButtonText: 'Confirmar Compra',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#ff9800',
                preConfirm: () => document.getElementById('swal-fazenda-destino').value
            });

            if (!selectedFazenda) return;
            fazendaId = selectedFazenda;

        } catch (e) {
            Swal.fire('Erro', 'Falha ao carregar as suas fazendas.', 'error');
            return;
        }
    }

    Swal.fire({ title: 'A assinar papéis...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/barracao/comprar', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chave_maquina: chave, fazenda_id: fazendaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) {
            Swal.fire('Entregue!', d.msg, 'success').then(() => {
                if (typeof abrirPainelBarracao === 'function' && URLAtual.includes('/fazenda/')) {
                    abrirPainelBarracao();
                }
            });
        } else {
            Swal.fire('Atenção', d.erro, 'warning');
        }
    });
};
