window.abrirPainelBarracao = async function() {
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Abrindo portões...', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`/api/barracao/listar?fazenda_id=${fazendaId}`);
        const data = await res.json();

        if (!data.sucesso) {
            Swal.fire('Erro', 'Falha ao carregar o barracão.', 'error');
            return;
        }

        const limiteVagas = data.limite_vagas || 4;
        const qtdAtual = data.maquinas.length;
        const corVagas = qtdAtual >= limiteVagas ? '#f44336' : '#4caf50';

        let maquinasHtml = '';
        if (qtdAtual === 0) {
            maquinasHtml = `<div style="text-align:center; padding: 20px; color:#888; border: 1px dashed #444; border-radius: 8px;">Nenhuma máquina estacionada. Vá à Concessionária!</div>`;
        } else {
            data.maquinas.forEach(m => {
                const corTanque = m.combustivel > 40 ? '#ff9800' : '#f44336';
                const corSaude = m.saude > 50 ? '#4caf50' : '#f44336';
                const imgSrc = `/static/img/${m.imagem}`;
                
                maquinasHtml += `
                <div style="background: #222; border: 1px solid #444; border-radius: 8px; padding: 12px; margin-bottom: 12px; text-align: left;">
                    
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        <img src="${imgSrc}" style="width: 60px; height: 60px; object-fit: contain; background: #111; padding: 5px; border-radius: 8px; border: 1px solid #333;" onerror="this.src='/static/img/trator.png'">
                        <div>
                            <h4 style="margin: 0; color: #fff; font-size: 16px;">${m.modelo}</h4>
                            <span style="font-size: 11px; color: #aaa;">Motor: ${m.potencia_hp} HP | IPVA: ${m.ipva ? '<span style="color:#4caf50">OK</span>' : 'Atrasado'}</span>
                        </div>
                    </div>
                    
                    <!-- Barra de Combustível -->
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-bottom: 3px;">
                            <span><i class="fas fa-gas-pump"></i> Tanque</span> <span>${m.combustivel}%</span>
                        </div>
                        <div style="width: 100%; background: #111; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #333;">
                            <div style="width: ${m.combustivel}%; background: ${corTanque}; height: 100%;"></div>
                        </div>
                    </div>

                    <!-- Barra de Saúde -->
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: #ccc; margin-bottom: 3px;">
                            <span><i class="fas fa-wrench"></i> Condição (Desgaste)</span> <span>${m.saude}%</span>
                        </div>
                        <div style="width: 100%; background: #111; height: 10px; border-radius: 5px; overflow: hidden; border: 1px solid #333;">
                            <div style="width: ${m.saude}%; background: ${corSaude}; height: 100%;"></div>
                        </div>
                    </div>

                    <!-- Botões de Ação com a Opção de Vender -->
                    <div style="display: flex; gap: 6px;">
                        <button onclick="abastecerMaquina(${m.id})" style="flex: 1; background: #ff9800; color: #000; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-gas-pump"></i> Abastecer
                        </button>
                        <button onclick="repararMaquina(${m.id})" style="flex: 1; background: #0288d1; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-tools"></i> Oficina
                        </button>
                        <button onclick="venderMaquina(${m.id}, '${m.modelo}')" style="flex: 1; background: #d32f2f; color: #fff; border: none; padding: 6px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-dollar-sign"></i> Vender
                        </button>
                    </div>
                </div>`;
            });
        }

        Swal.fire({
            title: 'Barracão Agrícola',
            html: `
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; text-align: left; margin-bottom: 10px;">
                    <span>Diesel: <b style="color: #ff9800;">${data.estoque_diesel} galões</b></span>
                    <span>Vagas: <b style="color: ${corVagas};">${qtdAtual} / ${limiteVagas}</b></span>
                </div>
                <div style="max-height: 50vh; overflow-y: auto; padding-right: 5px;">
                    ${maquinasHtml}
                </div>
                <hr style="border: 0; border-top: 1px solid #444; margin: 15px 0;">
                <div style="display: flex; gap: 8px;">
                    <button onclick="abrirConcessionaria()" style="flex: 2; background: #2e7d32; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">
                        <i class="fas fa-shopping-cart"></i> Concessionária
                    </button>
                    <button onclick="expandirBarracao()" style="flex: 1; background: #f57c00; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: pointer;">
                        <i class="fas fa-plus"></i> Expandir
                    </button>
                </div>
            `,
            background: '#1a1a1a', color: '#fff',
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Fechar'
        });

    } catch (e) {
        Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
    }
};

window.venderMaquina = function(id, modelo) {
    Swal.fire({
        title: 'Vender Máquina?',
        text: `Deseja vender o(a) ${modelo} para o ferro-velho? Eles pagam 50% do valor de tabela da concessionária.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d32f2f',
        confirmButtonText: 'Sim, Vender',
        cancelButtonText: 'Cancelar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Vendendo...', didOpen: () => Swal.showLoading() });
            fetch('/api/barracao/vender', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ maquina_id: id })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Vendido!', d.msg, 'success').then(() => abrirPainelBarracao());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};

window.expandirBarracao = function() {
    Swal.fire({
        title: 'Expandir Barracão',
        text: 'Aumentar a estrutura do barracão em +4 vagas custa R$ 150.000,00. Deseja realizar a obra?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f57c00',
        confirmButtonText: 'Sim, Construir',
        cancelButtonText: 'Voltar',
        background: '#2a2a2a', color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            const fazendaId = window.location.pathname.split('/').pop();
            Swal.fire({ title: 'Construindo...', didOpen: () => Swal.showLoading() });
            fetch('/api/barracao/expandir', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fazenda_id: fazendaId })
            }).then(r => r.json()).then(d => {
                if(d.sucesso) Swal.fire('Obra Concluída!', d.msg, 'success').then(() => abrirPainelBarracao());
                else Swal.fire('Erro', d.erro, 'error');
            });
        }
    });
};

window.abrirConcessionaria = function() {
    const catalogo = [
        { id: 'trator_leve', nome: 'Trator Leve', desc: '75 HP | Operações Básicas', preco: 85000, img: 'trator_leve.png', cor: '#f57c00' },
        { id: 'trator_pesado', nome: 'Trator Pesado', desc: '220 HP | Alta Potência', preco: 350000, img: 'trator_pesado.png', cor: '#d84315' },
        { id: 'trator_esteira', nome: 'Trator de Esteira', desc: '170 HP | Limpeza Pesada', preco: 450000, img: 'trator_esteira.png', cor: '#fbc02d' },
        { id: 'escavadeira', nome: 'Escavadeira', desc: '140 HP | Obras', preco: 550000, img: 'escavadeira.png', cor: '#f9a825' },
        { id: 'colheitadeira', nome: 'Colheitadeira', desc: '320 HP | Safra de Grãos', preco: 850000, img: 'colheitadeira.png', cor: '#ffb300' },
        { id: 'pulverizador', nome: 'Pulverizador', desc: '190 HP | Defensivos', preco: 420000, img: 'pulverizador.png', cor: '#0288d1' },
        { id: 'caminhonete_usada', nome: 'Caminhonete Usada', desc: '110 HP | Frete de pequenos animais', preco: 45000, img: 'caminhonete_usada.png', cor: '#795548' },
        { id: 'caminhonete_nova', nome: 'Caminhonete Nova', desc: '160 HP | Frete de pequenos animais', preco: 180000, img: 'caminhonete_nova.png', cor: '#d32f2f' },
        { id: 'caminhao_boiadeiro', nome: 'Caminhão Boiadeiro', desc: 'Zera o frete de Animais Pesados', preco: 250000, img: 'caminhao_boiadeiro.png', cor: '#2e7d32' },
        { id: 'caminhao_bau', nome: 'Caminhão Baú (Frios)', desc: 'Zera o frete de Peixes', preco: 200000, img: 'caminhao_bau.png', cor: '#1565c0' }
    ];

    let htmlCards = '<div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding: 5px 10px 5px 5px; margin-top: 10px;">';

    catalogo.forEach(c => {
        // 🔥 CORREÇÃO AQUI: Adicionado flex-shrink: 0; no final do style do card principal e do botão
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
        if(r.dismiss === Swal.DismissReason.cancel) abrirPainelBarracao();
    });
};

window.comprarMaquina = function(chave) {
    const fazendaId = window.location.pathname.split('/').pop();
    Swal.fire({ title: 'Assinando papéis...', didOpen: () => Swal.showLoading() });
    
    fetch('/api/barracao/comprar', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chave_maquina: chave, fazenda_id: fazendaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Entregue!', d.msg, 'success').then(() => abrirPainelBarracao());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.abastecerMaquina = function(maquinaId) {
    fetch('/api/barracao/abastecer', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ maquina_id: maquinaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) abrirPainelBarracao(); 
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};

window.repararMaquina = function(maquinaId) {
    fetch('/api/barracao/manutencao', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ maquina_id: maquinaId })
    }).then(r => r.json()).then(d => {
        if(d.sucesso) Swal.fire('Oficina', d.msg, 'success').then(() => abrirPainelBarracao());
        else Swal.fire('Atenção', d.erro, 'warning');
    });
};
