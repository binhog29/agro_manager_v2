window.CARRINHO_LOJA = {};

window.alterarQtdCarrinho = function(itemChave, itemNome, precoUn, delta) {
    if (!window.CARRINHO_LOJA[itemChave]) {
        window.CARRINHO_LOJA[itemChave] = { nome: itemNome, preco: precoUn, qtd: 0 };
    }
    
    window.CARRINHO_LOJA[itemChave].qtd += delta;
    
    if (window.CARRINHO_LOJA[itemChave].qtd <= 0) {
        delete window.CARRINHO_LOJA[itemChave];
    }
    
    let displayEl = document.getElementById(`qtd-${itemChave}`);
    if (displayEl) {
        displayEl.innerText = window.CARRINHO_LOJA[itemChave] ? window.CARRINHO_LOJA[itemChave].qtd : 0;
    }

    atualizarCarrinhoVisual();
};

window.atualizarCarrinhoVisual = function() {
    let totalItens = 0;
    let valorTotal = 0;
    
    for (let chave in window.CARRINHO_LOJA) {
        totalItens += window.CARRINHO_LOJA[chave].qtd;
        valorTotal += (window.CARRINHO_LOJA[chave].qtd * window.CARRINHO_LOJA[chave].preco);
    }
    
    let divCarrinho = document.getElementById('carrinho-flutuante');
    
    if (totalItens > 0) {
        if (!divCarrinho) {
            divCarrinho = document.createElement('div');
            divCarrinho.id = 'carrinho-flutuante';
            divCarrinho.style.cssText = `
                position: fixed; bottom: 85px; left: 50%; transform: translateX(-50%);
                background: #2e7d32; color: white; padding: 10px 20px; border-radius: 30px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 15px;
                z-index: 9999; cursor: pointer; font-weight: bold; border: 2px solid #1b5e20;
                width: max-content;
            `;
            divCarrinho.onclick = abrirCheckoutCarrinho;
            document.body.appendChild(divCarrinho);
        }
        divCarrinho.innerHTML = `
            <i class="fas fa-shopping-cart" style="font-size: 20px;"></i>
            <div style="display: flex; flex-direction: column; line-height: 1.1;">
                <span style="font-size: 11px;">${totalItens} itens</span>
                <span style="font-size: 15px;">R$ ${valorTotal.toFixed(2)}</span>
            </div>
            <div style="background: #fff; color: #2e7d32; padding: 4px 12px; border-radius: 15px; font-size: 12px; margin-left: 10px;">PAGAR <i class="fas fa-chevron-right"></i></div>
        `;
        divCarrinho.style.display = 'flex';
    } else {
        if (divCarrinho) divCarrinho.style.display = 'none';
    }
};

window.abrirCheckoutCarrinho = function() {
    let valorTotal = 0;
    let listaHTML = `<div style="max-height: 250px; overflow-y: auto; text-align: left; margin-bottom: 15px; background: #222; padding: 12px; border-radius: 8px;">`;
    
    let payload = [];

    for (let chave in window.CARRINHO_LOJA) {
        let item = window.CARRINHO_LOJA[chave];
        let subtotal = item.qtd * item.preco;
        valorTotal += subtotal;
        listaHTML += `
            <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding: 8px 0; font-size: 14px;">
                <span style="color: #ccc;">${item.qtd}x ${item.nome}</span>
                <strong style="color: #4caf50;">R$ ${subtotal.toFixed(2)}</strong>
            </div>`;
        
        payload.push({ item: chave, quantidade: item.qtd, preco: item.preco });
    }
    listaHTML += `</div>`;

    Swal.fire({
        title: 'Finalizar Compra',
        html: listaHTML + `<h3 style="margin:0; color:#fff;">Total: <span style="color:#4caf50;">R$ ${valorTotal.toFixed(2)}</span></h3>`,
        background: '#2a2a2a',
        color: '#fff',
        showCancelButton: true,
        confirmButtonColor: '#43a047',
        cancelButtonColor: '#d33',
        confirmButtonText: '<i class="fas fa-check"></i> Comprar Agora',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processando pagamento...', didOpen: () => Swal.showLoading() });
            
            // 🔥 BLINDADO: Pega o ID da fazenda atual pela URL para a entrega!
            const fazendaId = window.location.pathname.split('/').pop();
            
            fetch('/api/loja/checkout_carrinho', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ carrinho: payload, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    window.CARRINHO_LOJA = {}; 
                    Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Atenção', d.erro, 'warning');
                }
            }).catch(erro => {
                Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error');
            });
        }
    });
};
