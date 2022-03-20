import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const storagedProductIndex = cart.findIndex(product => product.id === productId);
      let newCart;

      if(storagedProductIndex >= 0) {
        const result = await updateProductAmount({
          productId: productId,
          amount: cart[storagedProductIndex].amount + 1
        });

        if(!result) {
          throw new Error("");
        }

        newCart = [...cart];
      } else {
        const response = await api.get(`products/${productId}`);
        const product: Product = response.data;

        product.amount = 1;
        newCart = [...cart, product];
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch(e: any) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(product => product.id === productId)) {
        throw new Error("Produto não encontrado");
      }

      const newCart = cart.filter(product => product.id !== productId);

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount === 0) {
        return;
      }

      const { data } = await api.get(`stock/${productId}`);

      if(!data) {
        throw new Error("Erro na alteração de quantidade do produto");
      }


      if(amount <= data.amount) {
        const newCart = cart.map(product => {
          if(product.id === productId) {
            product.amount = amount
          }

          return product;
        })

        setCart(newCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
        return true;
      } else {
        toast.error("Quantidade solicitada fora de estoque");
        return false;
      }
    } catch(e: any) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
