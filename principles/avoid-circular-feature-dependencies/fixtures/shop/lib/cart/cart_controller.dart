import 'package:shop/checkout/checkout_controller.dart';

class CartController {
  bool get isLocked => checkout.isActive;
}
