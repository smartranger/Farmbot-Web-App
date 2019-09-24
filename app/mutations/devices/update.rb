module Devices
  class Update < Mutations::Command
    BAD_TOOL_ID = "Can't mount to tool #%s because it does not exist."

    required do
      model :device, class: Device
    end

    optional do
      string :name
      string :timezone
      time :last_saw_mq
      integer :mounted_tool_id, nils: true
    end

    def validate
      validate_tool_id if better_tool_id
    end

    def execute
      p = inputs.except(:device).merge(mounted_tool_data)
      device.update_attributes!(p)
      device
    end

    private

    def bad_tool_id
      add_error :mounted_tool_id, :mounted_tool_id, BAD_TOOL_ID % better_tool_id
    end

    def validate_tool_id
      bad_tool_id unless device.tools.pluck(:id).include?(better_tool_id)
    end

    def better_tool_id
      @better_tool_id ||= ((mounted_tool_id || 0) > 0) ? mounted_tool_id : nil
    end

    def mounted_tool_data
      mounted_tool_id_present? ? { mounted_tool_id: better_tool_id } : {}
    end
  end
end
