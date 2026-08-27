window.prepararVendaGalpao = function(itemChave, itemNome, qtdMax) {
    Swal.fire({
        title: `Vender ${itemNome}`,
        text: `Você tem ${qtdMax} kg em estoque.`,
        input: 'number',
        inputAttributes: {
            min: 1,
            max: qtdMax,
            step: 1
        },
        inputValue: qtdMax, // Já sugere vender tudo
        showCancelButton: true,
        confirmButtonText: 'Confirmar Venda',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#8d6e63',
        background: '#2a2a2a', 
        color: '#fff',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0 || qtd > qtdMax) {
                Swal.showValidationMessage('Quantidade inválida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtdVenda = parseInt(result.value);
            
            // Captura o ID da fazenda atual pela URL
            const fazendaId = window.location.pathname.split('/').pop();
            
            Swal.fire({ title: 'Carregando caminhão...', didOpen: () => Swal.showLoading() });
            
            // Usamos a mesma rota do silo, pois o backend de vendas já suporta todos os itens!
            fetch('/api/silo/vender', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ item: itemChave, quantidade: qtdVenda, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire({title: 'Vendido!', text: d.msg, icon: 'success', background: '#2a2a2a', color: '#fff'})
                    .then(() => location.reload());
                } else {
                    Swal.fire({title: 'Erro', text: d.erro, icon: 'error', background: '#2a2a2a', color: '#fff'});
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};
