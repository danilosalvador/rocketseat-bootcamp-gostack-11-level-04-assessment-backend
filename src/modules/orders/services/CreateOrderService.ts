import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findCustomer = await this.customersRepository.findById(customer_id);

    if (!findCustomer) {
      throw new AppError(
        'Não foi possível encontrar o [customer] com o id informado.',
      );
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (findProducts.length !== products.length) {
      throw new AppError(
        'Não foi possível encontrar todos os produtos com os Ids informados.',
      );
    }

    const findProductsWithNonQuantityAvailable = products.filter(
      productReceived =>
        findProducts.filter(product => product.id === productReceived.id)[0]
          .quantity < productReceived.quantity,
    );

    if (findProductsWithNonQuantityAvailable.length) {
      throw new AppError(
        'Não existem quantidade suficientes para algum produto',
      );
    }

    const serializedProducts = products.map(productReceived => ({
      product_id: productReceived.id,
      quantity: productReceived.quantity,
      price: findProducts.filter(
        product => product.id === productReceived.id,
      )[0].price,
    }));

    const order = await this.ordersRepository.create({
      customer: findCustomer,
      products: serializedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
