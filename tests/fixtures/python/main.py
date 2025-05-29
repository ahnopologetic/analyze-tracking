from typing import Any, Dict, List

# Custom tracking function stub
def customTrackFunction(event_name: str, params: Dict[str, Any]) -> None:
    print(f"Custom track: {event_name} - {params}")

# Segment tracking example
def segment_track(user_id: str, plan: str) -> None:
    import segment.analytics as analytics
    analytics.write_key = 'YOUR_WRITE_KEY'
    analytics.track(user_id, "User Signed Up", {
        "method": "email",
        "is_free_trial": True,
        "plan": plan,
    })

# Mixpanel tracking example
def mixpanel_track(distinct_id: str, price: float, items: List[str]) -> None:
    from mixpanel import Mixpanel
    mp = Mixpanel('YOUR_PROJECT_TOKEN')
    mp.track(distinct_id, 'Purchase Completed', {
        'plan': 'premium',
        'price': price,
        'items': items,
    })

# Amplitude tracking example
def amplitude_track(user_id: str, size: int) -> None:
    from amplitude import Amplitude, BaseEvent
    client = Amplitude('YOUR_API_KEY')
    client.track(
        BaseEvent(
            event_type="Button Clicked",
            user_id=user_id,
            event_properties={
                "color": "red",
                "size": size,
            },
        )
    )

# Rudderstack tracking example
def rudderstack_track(user_id: str, os: str, version: int) -> None:
    import rudderstack.analytics as rudder_analytics
    rudder_analytics.write_key = 'YOUR_WRITE_KEY'
    rudder_analytics.dataPlaneUrl = 'YOUR_DATA_PLANE_URL'
    rudder_analytics.track(user_id, 'User Logged In', {
        'timestamp': 1625247600,
        'os': os,
        'version': version,
    })

# PostHog tracking example
def posthog_capture(distinct_id: str, method: str, is_free_trial: bool, plan: str) -> None:
    from posthog import Posthog
    posthog = Posthog('YOUR_PROJECT_API_KEY', host='https://us.i.posthog.com')
    # positional args
    posthog.capture(distinct_id, "user_signed_up", {
        "method": method,
        "is_free_trial": is_free_trial,
        "plan": plan,
    })
    # keyword args
    posthog.capture(distinct_id, event="user_cancelled_subscription", properties={
        "method": method,
        "is_free_trial": is_free_trial,
        "plan": plan,
    })

# Snowplow tracking examples
def snowplow_track_events(category: str, value: float) -> None:
    from snowplow_tracker import Snowplow, StructuredEvent
    tracker = Snowplow.create_tracker(namespace='ns', endpoint='collector.example.com')
    tracker.track(StructuredEvent(
        action="add-to-basket",
        category=category,
        label="web-shop",
        property_="pcs",
        value=value,
    ))

def main() -> None:
    segment_track("user123", plan="Pro")
    mixpanel_track("user123", 9.99, ["apple", "banana"])
    amplitude_track("ButtonClicked", {"color": "red", "size": 12})
    rudderstack_track("user123", "iOS", 14)
    posthog_capture("user123", "email", True, "premium")
    snowplow_track_events("shop", 2)
    customTrackFunction("custom_event", {"key": "value", "nested": {"a": [1,2,3]}})
