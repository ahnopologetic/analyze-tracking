require 'analytics-ruby'
require 'mixpanel-ruby'
require 'rudder-sdk-ruby'
require 'posthog'
require 'snowplow-tracker'

# Mock Analytics for Segment
class Analytics
  def self.track(params)
    # Mock implementation
  end
end

# Controller class with tracking methods
class TracksController
  # Segment tracking example
  def segment_track(plan)
    Analytics = Segment::Analytics.new({
      write_key: 'YOUR_WRITE_KEY',
      on_error: Proc.new { |status, msg| print msg }
    })
    Analytics.track(
      user_id: 'user123',
      event: 'User Signed Up',
      properties: {
        method: 'email',
        is_free_trial: true,
        plan: plan
      }
    )
  end

  # Mixpanel tracking example
  def mixpanel_track(user_id, plan)
    tracker = Mixpanel::Tracker.new("YOUR_PROJECT_TOKEN")
    tracker.track(user_id, 'Purchase Completed', {
      plan: plan,
      price: 9.99
    })
  end

  # Rudderstack tracking example
  def rudderstack_track(user_id, sku)
    analytics = Rudder::Analytics.new(
      write_key: 'WRITE_KEY',
      data_plane_url: 'DATA_PLANE_URL',
      gzip: true
    )
    analytics.track(
      user_id: user_id,
      event: 'Item Sold',
      properties: {
        sku: sku,
        shipping: 'Free'
      }
    )
  end

  # PostHog tracking examples
  def posthog_track(is_free_trial, plan)
    posthog = PostHog::Client.new({
      api_key: "ph_project_api_key",
      host: "https://us.i.posthog.com",
      on_error: Proc.new { |status, msg| print msg }
    })
    posthog.capture({
      distinct_id: 'user123',
      event: 'user_signed_up',
      properties: {
        method: 'email',
        is_free_trial: is_free_trial,
        plan: plan
      }
    })
  end

  # Custom tracking function
  def custom_track_event
    your_custom_track_function_name('custom_event', {
      key: 'value',
      nested: { a: [1, 2, 3] }
    })
  end

  private

  def your_custom_track_function_name(event_name, params = {})
    puts "Custom track: #{event_name} - #{params}"
  end
end

# Snowplow tracking example
def snowplow_track
  emitter = SnowplowTracker::Emitter.new(endpoint: 'collector.example.com')
  tracker = SnowplowTracker::Tracker.new(emitters: emitter)
  tracker.track_struct_event(
    category: 'shop',
    action: 'add-to-basket',
    label: 'web-shop',
    property: 'pcs',
    value: 2
  )
end

# Additional example in a module
module TrackingHelpers
  def self.track_something
    Analytics.track(
      anonymous_id: 'anonymous_user_123',
      event: 'Module Event',
      properties: {
        from_module: true
      }
    )
  end
end
