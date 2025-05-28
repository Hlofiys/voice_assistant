import { View, Text, StyleSheet } from "react-native";
import React, { useState } from "react";
import { AudioPlayerControls } from "@/components/audio/AudioPlayerControl";
import { TimeDisplay } from "@/components/audio/TimeDisplay";
import Button from "@/components/ui/buttons/Button";
import MessageDisplay from "@/components/audio/MessageDisplay";

const record = () => {
  const [userRequest, setUserRequest] = useState<string>("");
  return (
    <View style={styles.recordingContainer}>
      <MessageDisplay
        // userRequest={userRequest}
        // responseText="Lorem ipsum dolor sit amet consectetur adipisicing elit. At illum exercitationem enim odio distinctio doloremque? Eum natus in quae molestiae vel sint at nihil, placeat nobis quidem exercitationem veniam accusamus quos id incidunt? Labore porro ullam magnam vitae quidem debitis illo, rerum quia cumque placeat quas aliquam pariatur expedita! Lorem ipsum dolor sit amet consectetur adipisicing elit. At illum exercitationem enim odio distinctio doloremque? Eum natus in quae molestiae vel sint at nihil, placeat nobis quidem exercitationem veniam accusamus quos id incidunt? Labore porro ullam magnam vitae quidem debitis illo, rerum quia cumque placeat quas aliquam pariatur expedita!Lorem ipsum dolor sit amet consectetur adipisicing elit. At illum exercitationem enim odio distinctio doloremque? Eum natus in quae molestiae vel sint at nihil, placeat nobis quidem exercitationem veniam accusamus quos id incidunt? Labore porro ullam magnam vitae quidem debitis illo, rerum quia cumque placeat quas aliquam pariatur expedita!"
      />
    </View>
  );
};

export default record;
const styles = StyleSheet.create({
  recordingContainer: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    marginTop: 50,
    padding: 10,
  },
  text: {
    color: "red",
  },
});
