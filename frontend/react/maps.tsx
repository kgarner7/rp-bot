import mermaid from "mermaid";
import React from "react";
import { MinimalRoomWithLink } from "../../socket/helpers";

interface MapProps {
  map: MinimalRoomWithLink[];
  selected: boolean;
}

class Maps extends React.PureComponent<MapProps> {
  public render() {
    const className = this.props.selected ? "visible": "invisible";

    let html = "";

    if (this.props.map.length > 0) {
      let roomString = "graph TD\n";

      let roomNameMapping = new Map();
      let nextId = 1;

      for (const room of this.props.map) {
        let roomId;
  
        if (roomNameMapping.has(room.n)) {
          roomId = roomNameMapping.get(room.n);
        } else {
          roomId = nextId;
          roomNameMapping.set(room.n, roomId);
          nextId++;
        }
  
        if (room.l.length > 0) {
          for (const link of room.l) {
            roomString += `${roomId}["${room.n}"]`;
    
            if (link.h) {
              roomString += `-. "${link.n}" .->`;
            } else if (link.l) {
              roomString += `-- "${link.n}" -->`;
            } else {
              roomString += `== "${link.n}" ==>`;
            }
    
            let targetId;
  
            if (roomNameMapping.has(link.t)) {
              targetId = roomNameMapping.get(link.t);
            } else {
              targetId = nextId;
              roomNameMapping.set(link.t, targetId);
              nextId++;
            }
  
            roomString += `${targetId}["${link.t}"]\n`;
          } 
        } else {
          roomString += `${roomId}["${room.n}"]\n`;
        }
      }

      html = mermaid.render("id", roomString, () => {});
    }

    return <div className={ className } dangerouslySetInnerHTML={{ __html: html}}></div>;
  }
}

export default Maps;