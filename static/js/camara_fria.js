window.venderDerivados = function(produto, nomeProduto, qtdMax) {
    Swal.fire({
        title: `Vender ${nomeProduto}`,
        text: `Você possui ${qtdMax} em estoque.`,
        input: 'number',
                inputAttributes: { 
            min: produto === 'leite' ? 0.1 : 1, 
            max: qtdMax, 
            step: produto === 'leite' ? 'any' : '1',
            type: 'number'
        },
        inputValue: qtdMax, 
        showCancelButton: true,
        confirmButtonText: 'Confirmar Venda',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#2e7d32',
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
            const qtdVenda = parseFloat(result.value);
            const fazendaId = window.location.pathname.split('/').pop();
            
            Swal.fire({ title: 'Negociando venda...', didOpen: () => Swal.showLoading() });
            
            fetch('/api/armazem/vender_derivados', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ produto: produto, quantidade: qtdVenda, fazenda_id: fazendaId })
            })
            .then(r => r.json())
            .then(d => {
                if (d.sucesso) {
                    Swal.fire({title: 'Lucro na Conta! 💸', text: d.msg, icon: 'success', background: '#2a2a2a', color: '#fff'})
                    .then(() => location.reload());
                } else {
                    Swal.fire({title: 'Atenção', text: d.erro, icon: 'warning', background: '#2a2a2a', color: '#fff'});
                }
            })
            .catch(() => Swal.fire('Erro', 'Falha na comunicação com o servidor.', 'error'));
        }
    });
};
