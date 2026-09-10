window.abrirConcessionaria = function() {
    const catalogo = [
        { id: 'trator_leve', nome: 'Trator Leve', desc: '75 HP | Operações Básicas', preco: 85000, img: 'trator_leve.png', cor: '#f57c00' },
        { id: 'trator_pesado', nome: 'Trator Pesado', desc: '220 HP | Alta Potência', preco: 350000, img: 'trator_pesado.png', cor: '#d84315' },
        { id: 'trator_esteira', nome: 'Trator de Esteira', desc: '170 HP | Limpeza Pesada', preco: 450000, img: 'trator_esteira.png', cor: '#fbc02d' },
        { id: 'escavadeira', nome: 'Escavadeira', desc: '140 HP | Obras', preco: 550000, img: 'escavadeira.png', cor: '#f9a825' },
        { id: 'colheitadeira', nome: 'Colheitadeira', desc: '320 HP | Safra de Grãos', preco: 850000, img: 'colheitadeira.png', cor: '#ffb300' },
        { id: 'pulverizador', nome: 'Pulverizador', desc: '190 HP | Defensivos', preco: 420000, img: 'pulverizador.png', cor: '#0288d1' },
        { id: 'pulv_arrasto', nome: 'Pulv. de Arrasto', desc: 'Lento (Gasta horas do dia)', preco: 35000, img: 'pulv_arrasto.png', cor: '#0288d1' },
        { id: 'plantadeira', nome: 'Plantadeira', desc: '120 HP | -80% no Plantio', preco: 150000, img: 'plantadeira.png', cor: '#4caf50' },
        { id: 'grade_aradora', nome: 'Grade Aradora', desc: '140 HP | -80% no Preparo de Solo', preco: 65000, img: 'grade_aradora.png', cor: '#8d6e63' },
        { id: 'caminhonete_usada', nome: 'Caminhonete Usada', desc: '110 HP | Frete de pequenos animais', preco: 45000, img: 'caminhonete_usada.png', cor: '#795548' },
        { id: 'caminhonete_nova', nome: 'Caminhonete Nova', desc: '160 HP | Frete de pequenos animais', preco: 180000, img: 'caminhonete_nova.png', cor: '#d32f2f' },
        { id: 'caminhao_boiadeiro', nome: 'Caminhão Boiadeiro', desc: 'Zera o frete de Animais Pesados', preco: 250000, img: 'caminhao_boiadeiro.png', cor: '#2e7d32' },
        { id: 'caminhao_bau', nome: 'Caminhão Baú (Frios)', desc: 'Zera o frete de Peixes', preco: 200000, img: 'caminhao_bau.png', cor: '#1565c0' }
    ];

    let htmlCards = '<div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 5px 10px 5px 5px; margin-top: 10px;">';

    catalogo.forEach(c => {
        htmlCards += `
            <div style="background: #1e1e1e; border: 1px solid #333; border-radius: 12px; display: flex; align-items: center; padding: 12px; position: relative; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.3); flex-shrink: 0;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: ${c.cor};"></div>
                <div style="background: #111; border-radius: 8px; padding: 5px; width: 65px; height: 65px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #2a2a2a; margin-left: 5px;">
                    <img src="/static/img/${c.img}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5));" onerror="this.src='/static/img/trator.png'">
                </div>
                <div style="flex: 1; text-align: left; padding-left: 12px;">
                    <h4 style="margin: 0 0 3px 0; color: #fff; font-size: 15px;">${c.nome}</h4>
                    <div style="font-size: 11px; color: #aaa; margin-bottom: 5px;">${c.desc}</div>
                    <div style="color: #4caf50; font-weight: 900; font-size: 14px;">R$ ${c.preco.toLocaleString('pt-BR')}</div>
                </div>
                <button onclick="comprarMaquina('${c.id}')" style="background: ${c.cor}; color: #fff; border: none; width: 45px; height: 45px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 0 rgba(0,0,0,0.4); transition: transform 0.1s;">
                    <i class="fas fa-cart-plus"></i>
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
        showCancelButton: true,
        cancelButtonText: 'Sair da Loja',
        cancelButtonColor: '#444'
    }).then((r) => {
        // Se a loja foi aberta a partir do Barracão, ele reabre o barracão ao fechar a loja
        if(r.dismiss === Swal.DismissReason.cancel && window.location.pathname.includes('/fazenda/')) {
            if (typeof abrirPainelBarracao === 'function') abrirPainelBarracao();
        }
    });
};

window.comprarMaquina = function(chave) {
    const URLAtual = window.location.pathname;
    let fazendaId = null;

    if (URLAtual.includes('/fazenda/')) {
        fazendaId = URLAtual.split('/').pop();
    } else {
        Swal.fire('Aviso', 'A função de comprar direto do mapa e escolher a fazenda de destino será adicionada em breve! Por enquanto, entre na sua fazenda para comprar.', 'info');
        return;
    }

    Swal.fire({ title: 'Assinando papéis...', didOpen: () => Swal.showLoading() });
    
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
