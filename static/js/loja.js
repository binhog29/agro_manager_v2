window.prepararCompra = function(itemChave, itemNome, precoUn) {
    Swal.fire({
        title: `Comprar ${itemNome}`,
        text: `Custo unitário: R$ ${precoUn.toFixed(2)}`,
        input: 'number',
        inputAttributes: {
            min: 1,
            step: 1
        },
        inputValue: 1,
        showCancelButton: true,
        confirmButtonText: 'Avançar',
        cancelButtonText: 'Cancelar',
        preConfirm: (qtd) => {
            if (!qtd || qtd <= 0) {
                Swal.showValidationMessage('Insira uma quantidade válida!');
            }
            return qtd;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const qtd = parseInt(result.value);
            const custoTotal = qtd * precoUn;
            
            Swal.fire({
                title: 'Confirmar Pagamento?',
                text: `Total: R$ ${custoTotal.toFixed(2)} por ${qtd}x ${itemNome}`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#43a047',
                confirmButtonText: 'Sim, Comprar!'
            }).then((confirma) => {
                if (confirma.isConfirmed) {
                    Swal.fire({ title: 'Processando...', didOpen: () => Swal.showLoading() });
                    
                    fetch('/api/loja/comprar', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ item: itemChave, quantidade: qtd, preco: precoUn })
                    })
                    .then(r => {
                        // Se o servidor retornar erro 404 ou 500, força a cair no catch
                        if (!r.ok) throw new Error('Erro de comunicação HTTP: ' + r.status);
                        return r.json();
                    })
                    .then(d => {
                        if (d.sucesso) {
                            Swal.fire('Sucesso!', d.msg, 'success').then(() => location.reload());
                        } else {
                            Swal.fire('Atenção', d.erro, 'warning');
                        }
                    })
                    .catch(erro => {
                        console.error(erro);
                        Swal.fire(
                            'Erro no Servidor!', 
                            'A compra falhou. Verifique a tela preta do Termux para ver se esqueceu de registrar a loja no app.py!', 
                            'error'
                        );
                    });
                }
            });
        }
    });
};
