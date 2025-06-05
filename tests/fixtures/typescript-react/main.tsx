import React, { useCallback, useEffect, useState } from 'react';
import type { Product } from '../typescript/main';

interface CartProps {
    products: Product[];
}

export const ShoppingCart: React.FC<CartProps> = ({ products }) => {
    const [cartItems, setCartItems] = useState<Product[]>([]);
    const [isCheckingOut, setIsCheckingOut] = useState(false);

    // Direct tracking call in useEffect
    useEffect(() => {
        if (cartItems.length > 0) {
            posthog.capture('cart_viewed', {
                item_count: cartItems.length,
                total_value: cartItems.reduce((sum, item) => sum + item.price, 0)
            });
        }
    }, [cartItems]);

    // Tracking in useCallback
    const handleAddToCart = useCallback((product: Product) => {
        setCartItems(prev => [...prev, product]);

        // Segment tracking
        analytics.track('add_to_cart', {
            product_id: product.id,
            product_name: product.name,
            price: product.price
        });

        // Amplitude tracking
        amplitude.track('item_added', {
            item_details: product,
            cart_size: cartItems.length + 1
        });
    }, [cartItems]);

    // Arrow function with tracking
    const removeFromCart = (productId: string) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));

        // Mixpanel tracking Custom Function
        mixpanel.track('remove_from_cart', {
            product_id: productId,
            timestamp: new Date().toISOString()
        });
    };

    // Regular method with tracking
    function handleCheckout() {
        setIsCheckingOut(true);

        // GA4 tracking
        gtag('event', 'begin_checkout', {
            items: cartItems,
            value: cartItems.reduce((sum, item) => sum + item.price, 0),
            currency: 'USD'
        });

        // Rudderstack tracking
        rudderanalytics.track('checkout_started', {
            products: cartItems,
            total_items: cartItems.length
        });

        // mParticle tracking
        mParticle.logEvent(
            'InitiateCheckout',
            mParticle.EventType.Transaction,
            {
                cart_items: cartItems,
                checkout_step: 1
            }
        );
    }

    // Tracking with custom event builder
    const trackCartUpdate = () => {
        tracker.track('cart_update', {
            cart_size: cartItems.length
        });
    }

    return (
        <div className="shopping-cart">
            <h2>Shopping Cart ({cartItems.length} items)</h2>

            {products.map(product => (
                <div key={product.id} className="product-item">
                    <span>{product.name} - ${product.price}</span>
                    <button onClick={() => {
                        handleAddToCart(product);
                        trackCartUpdate();
                    }}>Add to Cart</button>
                </div>
            ))}

            <div className="cart-items">
                {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                        <span>{item.name}</span>
                        <button onClick={() => removeFromCart(item.id)}>Remove</button>
                    </div>
                ))}
            </div>

            <button
                onClick={handleCheckout}
                disabled={cartItems.length === 0 || isCheckingOut}
            >
                Proceed to Checkout
            </button>
        </div>
    );
};
