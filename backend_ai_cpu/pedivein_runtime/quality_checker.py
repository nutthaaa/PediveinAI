from pathlib import Path
import argparse, json
import cv2, numpy as np
from PIL import Image, UnidentifiedImageError

HERE=Path(__file__).resolve().parent
CONFIG=json.loads((HERE.parent/"config"/"capture_quality_config_v1.json").read_text())
LOCAL_CONFIG=json.loads((HERE.parent/"config"/"local_capture_quality_relaxed_v1.json").read_text())
for path,value in LOCAL_CONFIG["warning_overrides"].items():
    metric,key=path.split(".")
    CONFIG["thresholds"][metric][key]=value
CONFIG["specification_version"]=LOCAL_CONFIG["version"]
CONFIG["threshold_status"]=LOCAL_CONFIG["status"]
CONFIG["disclaimer"]="Pilot engineering quality profile; hard rejects unchanged; not a clinical imaging standard."
def measure(path, mask_path=None):
    try:
        with Image.open(path) as opened: image=opened.convert("RGB"); original_mode=opened.mode
    except (OSError,UnidentifiedImageError) as e: return None,str(e)
    rgb=np.asarray(image); gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY); gx=cv2.Sobel(gray,cv2.CV_64F,1,0,ksize=3);gy=cv2.Sobel(gray,cv2.CV_64F,0,1,ksize=3);p5,p95=np.percentile(gray,[5,95])
    m={"file_readable":True,"original_mode":original_mode,"width":image.width,"height":image.height,"short_side":min(image.size),"brightness_mean":float(gray.mean()),"brightness_std":float(gray.std()),"underexposure_fraction":float((gray<=15).mean()),"overexposure_fraction":float((gray>=240).mean()),"laplacian_variance":float(cv2.Laplacian(gray,cv2.CV_64F).var()),"tenengrad":float(np.mean(gx*gx+gy*gy)),"edge_density":float((cv2.Canny(gray,100,200)>0).mean()),"dynamic_range_p95_p5":float(p95-p5)}
    if mask_path:
        mask=np.asarray(Image.open(mask_path).convert("L"))>0
        if mask.shape!=gray.shape: raise ValueError("Mask dimensions differ from image")
        ys,xs=np.where(mask);border=np.zeros_like(mask);border[:3,:]=border[-3:,:]=True;border[:,:3]=border[:,-3:]=True
        m.update({"arm_occupancy_ratio":float(mask.mean()),"arm_bbox_occupancy":float((xs.max()-xs.min()+1)*(ys.max()-ys.min()+1)/mask.size),"mask_fraction_within_3px_boundary":float((mask&border).sum()/max(mask.sum(),1))})
    return m,None
def assess(path,mask_path=None,flags=None):
    flags=flags or {};m,error=measure(path,mask_path);reasons=[];warnings=[];checks={}
    if error:return {"status":"RETAKE","reasons":["File unreadable"],"error":error,"metrics":{},"checks":{"file_readable":"REJECT"}}
    t=CONFIG["thresholds"]; checks["file_readable"]="PASS"; checks["color_image"]="PASS" if m["original_mode"] not in ["1","L","I","F"] else "MANUAL_REVIEW"
    def low(name,value):
        z=t[name];state="REJECT" if value<z["reject_below"] else ("WARNING" if value<z["warning_below"] else "PASS");checks[name]=state;(reasons if state=="REJECT" else warnings if state=="WARNING" else []).append(z["message"] if state!="PASS" else "")
    def high(name,value):
        z=t[name];state="REJECT" if value>z["reject_above"] else ("WARNING" if value>z["warning_above"] else "PASS");checks[name]=state;(reasons if state=="REJECT" else warnings if state=="WARNING" else []).append(z["message"] if state!="PASS" else "")
    low("short_side",m["short_side"]);low("brightness_mean",m["brightness_mean"]);high("underexposure_fraction",m["underexposure_fraction"]);high("overexposure_fraction",m["overexposure_fraction"]);low("brightness_std",m["brightness_std"]);low("dynamic_range_p95_p5",m["dynamic_range_p95_p5"])
    sharp_reject=m["laplacian_variance"]<t["laplacian_variance"]["reject_below"] and m["tenengrad"]<t["tenengrad"]["reject_below"];sharp_warn=m["laplacian_variance"]<t["laplacian_variance"]["warning_below"] or m["tenengrad"]<t["tenengrad"]["warning_below"];checks["sharpness"]="REJECT" if sharp_reject else ("WARNING" if sharp_warn else "PASS");(reasons if sharp_reject else warnings if sharp_warn else []).append("Image may be blurred" if sharp_reject or sharp_warn else "")
    if "arm_occupancy_ratio" in m:
        o=t["arm_occupancy_ratio"];b=t["arm_bbox_occupancy"];bf=t["boundary_fraction"];bad=m["arm_occupancy_ratio"]<o["reject_below"] or m["arm_occupancy_ratio"]>o["reject_above"] or m["arm_bbox_occupancy"]<b["reject_below"] or m["arm_bbox_occupancy"]>b["reject_above"];warn=bad or m["arm_occupancy_ratio"]<o["warning_below"] or m["arm_occupancy_ratio"]>o["warning_above"] or m["arm_bbox_occupancy"]<b["warning_below"] or m["arm_bbox_occupancy"]>b["warning_above"] or m["mask_fraction_within_3px_boundary"]>bf["warning_above"];checks["arm_framing"]="REJECT" if bad else ("WARNING" if warn else "PASS");(reasons if bad else warnings if warn else []).append("Arm framing/ROI occupancy is outside engineering range" if bad or warn else "")
    else:checks["arm_framing"]="NOT_ASSESSED_UNTIL_SEGMENTATION"
    for key,msg,state in [("text_identifier","Patient identifier or clinical text visible","REJECT"),("obstruction","Large obstruction over clinical ROI","REJECT"),("glare","Severe glare over clinical ROI","REJECT"),("extreme_angle","Possible extreme camera angle","WARNING"),("background_clutter","Background clutter may impair segmentation","WARNING")]:
        if flags.get(key):(reasons if state=="REJECT" else warnings).append(msg);checks[key]=state
    reasons=[x for x in reasons if x];warnings=[x for x in warnings if x]
    status="RETAKE" if reasons else ("MANUAL_REVIEW" if warnings or checks["color_image"]!="PASS" else "PASS")
    return {"specification_version":CONFIG["specification_version"],"status":status,"reasons":sorted(set(reasons)),"warnings":sorted(set(warnings)),"checks":checks,"metrics":m,"disclaimer":CONFIG["disclaimer"]}
def main():
    p=argparse.ArgumentParser();p.add_argument("image",type=Path);p.add_argument("--mask",type=Path);p.add_argument("--json-output",type=Path);p.add_argument("--text-identifier",action="store_true");p.add_argument("--obstruction",action="store_true");p.add_argument("--glare",action="store_true");p.add_argument("--extreme-angle",action="store_true");p.add_argument("--background-clutter",action="store_true");a=p.parse_args();flags={k:getattr(a,k) for k in ["text_identifier","obstruction","glare","extreme_angle","background_clutter"]};r=assess(a.image,a.mask,flags);print("PEDIVEIN IMAGE QUALITY CHECK");[print(f"{k}: {v}") for k,v in r["checks"].items()];print(f"FINAL QUALITY STATUS: {r['status']}");[print(f"- {x}") for x in r["reasons"]+r["warnings"]];
    if a.json_output:a.json_output.write_text(json.dumps(r,indent=2)+"\n")
if __name__=="__main__":main()
