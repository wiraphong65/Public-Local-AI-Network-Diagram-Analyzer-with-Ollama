import json
import asyncio
import aiohttp
from aiohttp import ClientTimeout
import time
from typing import Dict, List, Any, Optional, Union, Literal
from .config import settings
import logging

logger = logging.getLogger(__name__)

class OllamaService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        # Fixed model - cannot be changed
        self.model = settings.OLLAMA_MODEL
        # ตั้งเวลา timeout เป็นวินาที (3600 วินาที = 1 ชั่วโมง)
        timeout_seconds = getattr(settings, "OLLAMA_TIMEOUT", 3600)
        self.timeout = ClientTimeout(total=timeout_seconds)
        # Reusable aiohttp session
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def check_ollama_health(self) -> bool:
        """ตรวจสอบว่า Ollama ทำงานอยู่หรือไม่"""
        try:
            session = await self._get_session()
            # ใช้ v1 API format สำหรับ health check
            async with session.get(f"{self.base_url}/v1/models", timeout=self.timeout) as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"การตรวจสอบสถานะของ Ollama ไม่สำเร็จ หรือ Ollama ไม่ตอบสนอง: {e}")
            return False
    
    

    
    async def generate_response(self, prompt: str, context: Optional[Dict] = None, max_retries: int = 3) -> str:
        """สร้างคำตอบจาก Ollama (มี retry logic)"""
        for attempt in range(max_retries):
            try:
                # สร้าง system prompt สำหรับ network topology analysis
                system_prompt = """คุณเป็นผู้เชี่ยวชาญด้านเครือข่ายคอมพิวเตอร์ ให้คำแนะนำเกี่ยวกับการออกแบบและวิเคราะห์แผนผังเครือข่าย 
                ให้คำตอบเป็นภาษาไทยที่เข้าใจง่าย และให้คำแนะนำที่เป็นประโยชน์"""

                # สร้าง full prompt
                full_prompt = f"{system_prompt}\n\nคำถาม: {prompt}"
                
                if context:
                    # เช็กว่ามี nodes และ edges จริงหรือไม่
                    if not context.get("nodes") or not context.get("edges"):
                        return "ไม่พบข้อมูลเครือข่าย กรุณาสร้าง อุปกรณ์ และการเชื่อมต่อ"
                    # ปรับปรุง: สร้าง context ที่ส่งข้อมูลครบทั้งหมด ไม่จำกัด
                    context_summary = self._create_context(context, format_type="summary")
                    
                    # Debug log เพื่อดูว่า context มีข้อมูล bandwidth/throughput/user capacity หรือไม่
                    logger.info(f"[AI CONTEXT SUMMARY] {context_summary}")
                    
                    full_prompt += f"\n\nข้อมูลแผนผังเครือข่าย: {context_summary}"

                # ใช้ Ollama v1 chat completions API format
                # เพิ่ม context window และ tokens เพื่อรองรับข้อมูลเยอะขึ้น
                payload = {
                    "model": self.model,
                    "messages": [
                        {
                            "role": "user",
                            "content": full_prompt
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 12000,      # เพิ่มจาก 4000 เป็น 12000
                        "num_ctx": 131072,        # เพิ่มจาก 8192 เป็น 131072 (รองรับข้อมูลเยอะ)
                        "num_predict": 12000     # เพิ่มจาก 4000 เป็น 12000
                    }
                }

                session = await self._get_session()
                async with session.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        # ปรับปรุงการ parse response ให้ robust กว่านี้
                        choices = result.get("choices", [])
                        if choices and len(choices) > 0:
                            message = choices[0].get("message", {})
                            if "content" in message:
                                return message.get("content", "ไม่สามารถสร้างคำตอบได้")
                        return "ไม่สามารถสร้างคำตอบได้"
                    else:
                        error_text = await response.text()
                        logger.error(f"Ollama API error (attempt {attempt + 1}): {response.status} - {error_text}")
                        
                        # ถ้าเป็น error ที่ไม่ควร retry (เช่น 400, 401, 403)
                        if response.status in [400, 401, 403, 404]:
                            return f"เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI (Status: {response.status})"
                        
                        # ถ้าเป็น attempt สุดท้าย ให้ return error
                        if attempt == max_retries - 1:
                            return f"เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI (Status: {response.status})"

            except asyncio.TimeoutError:
                logger.error(f"Ollama request timeout (attempt {attempt + 1})")
                if attempt == max_retries - 1:
                    return "การเชื่อมต่อกับ AI ใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
                # รอสักครู่ก่อน retry
                await asyncio.sleep(1 * (attempt + 1))
                
            except Exception as e:
                logger.error(f"Error generating response (attempt {attempt + 1}): {e}")
                if attempt == max_retries - 1:
                    return f"เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI: {str(e)}"
                # รอสักครู่ก่อน retry
                await asyncio.sleep(1 * (attempt + 1))
        
        return "ไม่สามารถสร้างคำตอบได้หลังจากลองหลายครั้ง"
    
    def _create_context(
        self, 
        context_or_nodes: Union[Dict, List[Dict]], 
        edges: Optional[List[Dict]] = None, 
        format_type: Literal["summary", "detailed"] = "summary"
    ) -> Union[str, Dict[str, Any]]:
       
        try:
            if format_type == "summary":
                # ใช้กับ context dict (สำหรับ generate_response)
                context = context_or_nodes
                analysis = context.get("analysis", {})
                nodes = context.get("nodes", [])
                edges = context.get("edges", [])
                
                # สร้าง summary แบบไม่จำกัดข้อมูล (ส่งครบทุกอย่าง)
                summary_parts = []
                
                # ข้อมูลพื้นฐาน
                summary_parts.append(f"จำนวนอุปกรณ์: {len(nodes)}")
                summary_parts.append(f"จำนวนการเชื่อมต่อ: {len(edges)}")
                
                # สรุปประเภทอุปกรณ์
                device_types = {}
                for node in nodes:
                    device_type = node.get("data", {}).get("deviceType", "Unknown")
                    device_types[device_type] = device_types.get(device_type, 0) + 1
                
                if device_types:
                    device_summary = ", ".join([f"{k}: {v}" for k, v in device_types.items()])
                    summary_parts.append(f"ประเภทอุปกรณ์: {device_summary}")
                
                # สรุปการเชื่อมต่อ (ส่งครบทั้งหมด - ไม่จำกัด)
                if edges:
                    # สร้าง mapping id -> label
                    id_to_label = {node.get("id"): node.get("data", {}).get("label", node.get("id")) for node in nodes}
                    connection_summary = []
                    # ลบการจำกัด ออก - ส่งครบทุกการเชื่อมต่อ
                    for edge in edges:
                        source_id = edge.get("source", "Unknown")
                        target_id = edge.get("target", "Unknown")
                        source_label = id_to_label.get(source_id, source_id)
                        target_label = id_to_label.get(target_id, target_id)
                        
                        # เพิ่มข้อมูล bandwidth ถ้ามี
                        edge_data = edge.get("data", {})
                        bandwidth_info = ""
                        if edge_data.get("bandwidth"):
                            bandwidth_unit = edge_data.get("bandwidthUnit", "")
                            bandwidth_info = f" [{edge_data['bandwidth']} {bandwidth_unit}]"
                        
                        connection_summary.append(f"{source_label} -> {target_label}{bandwidth_info}")
                    
                    summary_parts.append(f"การเชื่อมต่อ:\n" + "\n".join(connection_summary))
                
                # เพิ่มข้อมูล throughput, bandwidth และ user capacity (ส่งครบทั้งหมด)
                throughput_info = []
                user_info = []
                
                # เก็บข้อมูล throughput และ user capacity จาก nodes ทั้งหมด (ไม่จำกัด)
                for node in nodes:
                    data = node.get("data", {})
                    node_label = data.get("label", node.get("id", "Unknown"))
                    node_type = data.get("deviceType", "Unknown")
                    
                    device_details = []
                    
                    # Max Throughput
                    if data.get("maxThroughput"):
                        throughput_unit = data.get("throughputUnit", "")
                        device_details.append(f"Throughput: {data['maxThroughput']} {throughput_unit}")
                    
                    # User Capacity (สำหรับ PC)
                    if data.get("userCapacity"):
                        device_details.append(f"Users: {data['userCapacity']}")
                    
                    # Device Role
                    if data.get("deviceRole"):
                        device_details.append(f"Role: {data['deviceRole']}")
                    
                    if device_details:
                        throughput_info.append(f"{node_label} ({node_type}): {', '.join(device_details)}")
                
                # ส่งข้อมูล throughput ครบทั้งหมด (ไม่จำกัด [:3])
                if throughput_info:
                    summary_parts.append(f"\nรายละเอียดอุปกรณ์:\n" + "\n".join(throughput_info))
                
                return "\n".join(summary_parts)
                
            else:  # format_type == "detailed"
                # ใช้กับ nodes และ edges lists (สำหรับ get_ai_analysis)
                nodes = context_or_nodes
                
                # สรุปข้อมูลอุปกรณ์ (ส่งครบทั้งหมด)
                device_summary = []
                for node in nodes:
                    data = node.get("data", {})
                    device_info = {
                        "id": node.get("id", "Unknown"),
                        "type": data.get("type", "Unknown"),
                        "label": data.get("label", "Unknown"),
                        "device_type": data.get("deviceType", "Unknown"),
                        "throughput": data.get("maxThroughput", "N/A"),
                        "throughput_unit": data.get("throughputUnit", ""),
                        "user_capacity": data.get("userCapacity", "N/A"),
                        "device_role": data.get("deviceRole", "N/A")
                    }
                    device_summary.append(device_info)
                
                # สรุปการเชื่อมต่อ (ส่งครบทั้งหมด)
                connection_summary = []
                for edge in edges:
                    edge_data = edge.get("data", {})
                    connection_info = {
                        "from": edge.get("source", "Unknown"),
                        "to": edge.get("target", "Unknown"),
                        "bandwidth": edge_data.get("bandwidth", "N/A"),
                        "bandwidth_unit": edge_data.get("bandwidthUnit", ""),
                        "label": edge_data.get("label", "")
                    }
                    connection_summary.append(connection_info)
                
                # สร้าง context แบบละเอียด (ไม่จำกัดข้อมูล)
                optimized_context = {
                    "device_count": len(nodes),
                    "connection_count": len(edges),
                    "devices": device_summary,
                    "connections": connection_summary,
                    "network_analysis": {
                        "total_devices": len(nodes),
                        "total_connections": len(edges),
                        "device_types": list(set([node.get("data", {}).get("deviceType", "Unknown") for node in nodes])),
                        "all_bandwidth_info": [
                            {
                                "edge": f"{edge.get('source')} -> {edge.get('target')}",
                                "bandwidth": edge.get("data", {}).get("bandwidth", "N/A"),
                                "unit": edge.get("data", {}).get("bandwidthUnit", "")
                            }
                            for edge in edges if edge.get("data", {}).get("bandwidth")
                        ],
                        "all_throughput_info": [
                            {
                                "device": node.get("data", {}).get("label", node.get("id")),
                                "throughput": node.get("data", {}).get("maxThroughput", "N/A"),
                                "unit": node.get("data", {}).get("throughputUnit", "")
                            }
                            for node in nodes if node.get("data", {}).get("maxThroughput")
                        ]
                    }
                }
                
                return optimized_context
            
        except Exception as e:
            logger.error(f"Error creating context: {e}")
            if format_type == "summary":
                # Fallback: ส่งข้อมูลแบบเต็ม
                return json.dumps({
                    "device_count": len(context_or_nodes.get("nodes", [])),
                    "connection_count": len(context_or_nodes.get("edges", [])),
                    "nodes": context_or_nodes.get("nodes", []),
                    "edges": context_or_nodes.get("edges", []),
                    "analysis": context_or_nodes.get("analysis", {})
                }, ensure_ascii=False)
            else:
                # Fallback: สร้าง context แบบเต็ม
                return {
                    "device_count": len(context_or_nodes),
                    "connection_count": len(edges or []),
                    "devices": context_or_nodes,
                    "connections": edges or []
                }

class NetworkTopologyAnalyzer:
    def __init__(self):
        self.ollama_service = OllamaService()
    
    async def get_ai_analysis(self, nodes: List[Dict], edges: List[Dict]) -> str:
        """รับการวิเคราะห์จาก AI (ไม่รับ prompt จาก user)"""
        if not await self.ollama_service.check_ollama_health():
            return "ไม่สามารถเชื่อมต่อกับ Ollama ได้ กรุณาตรวจสอบว่า Ollama ทำงานอยู่ที่ http://10.80.49.111:11434"

        # สร้าง context ที่มี key 'nodes' และ 'edges' ตรงกับที่ generate_response ต้องการ
        context = {"nodes": nodes, "edges": edges}
        prompt = """วิเคราะห์แผนผังเครือข่ายนี้อย่างครอบคลุม โดยจำกัดการวิเคราะห์เฉพาะในมิติ 
        **การออกแบบและโครงสร้างทางกายภาพ (Physical/Topology)** เท่านั้น ไม่ต้องวิเคราะห์ในเชิง **Logical Layer, Protocol, หรือการตั้งค่า IP**  

## 1. การจัดวางอุปกรณ์ตามหลักการ Layer ของเครือข่าย

### 1.1 วิเคราะห์การจัดวาง Layer ปัจจุบัน
- ระบุว่าอุปกรณ์แต่ละตัวอยู่ใน Layer ใด (Internet Edge, Core, Distribution, Access)
- ตรวจสอบว่าการจัดวางปัจจุบันเป็นไปตามหลักการออกแบบเครือข่ายหรือไม่
- ระบุอุปกรณ์ที่วางผิด Layer (ถ้ามี)

### 1.2 คำแนะนำการจัดวางที่เหมาะสม
- **Internet Edge Layer**: แนะนำอุปกรณ์ที่ควรอยู่ชั้นนี้ (ISP, Edge Router, Firewall)
- **Core Layer**: แนะนำอุปกรณ์ที่ควรเป็นแกนกลาง (Core Switch, Core Router)
- **Distribution Layer**: แนะนำอุปกรณ์กระจายสัญญาณ (Distribution Switch, L3 Switch)
- **Access Layer**: แนะนำอุปกรณ์ที่เชื่อมต่อกับ End Device (Access Switch, Wireless AP)
- ให้เหตุผลว่าทำไมควรจัดวางแบบนั้น

### 1.3 การปรับปรุงตำแหน่งอุปกรณ์
- เสนอการย้ายอุปกรณ์ที่อยู่ผิดตำแหน่ง
- แนะนำการเพิ่มอุปกรณ์ในแต่ละ Layer (ถ้าขาด)

## 2. การวิเคราะห์โครงสร้างและจุดบกพร่อง

### 2.1 ตรวจสอบการเชื่อมต่อผิดลำดับ
- **ระบุการเชื่อมต่อที่ผิดหลักการ**: เช่น PC เชื่อมตรงกับ Core Switch, Server เชื่อมกับ Access Switch
- **ตรวจสอบ Hierarchy**: เช็คว่ามีการข้าม Layer หรือเชื่อมต่อย้อนกลับ (Backward Connection)
- **Flat Network Problem**: ระบุถ้าเครือข่ายแบนเกินไป (ไม่มีการแบ่ง Layer)

### 2.2 ระบุจุดคอขวด (Bottleneck)
- **Traffic Concentration**: ระบุจุดที่ Traffic มารวมกันมากเกินไป
- **Bandwidth Mismatch**: ชี้ให้เห็นจุดที่ bandwidth ไม่สมดุลกัน
- **Overloaded Device**: ระบุอุปกรณ์ที่อาจรับภาระมากเกินไป
- **ISP Connection**: ประเมินว่า bandwidth จาก ISP เพียงพอหรือเป็นจุดคอขวด

### 2.3 การไหลของข้อมูล (Data Flow)
- ติดตามเส้นทางข้อมูลจาก End Device → Access → Distribution → Core → ISP
- ระบุเส้นทางที่ไม่มีประสิทธิภาพหรือเส้นทางอ้อม
- ประเมินความซับซ้อนของการเชื่อมต่อ

### 2.4 จุดเสี่ยงอื่นๆ
- **Single Point of Failure (SPOF)**: ระบุจุดที่ถ้าขาดแล้วเครือข่ายล่ม
- **Lack of Redundancy**: ชี้ให้เห็นจุดที่ขาด Backup Path
- **Security Gap**: ระบุจุดที่อาจเกิดช่องโหว่ด้านความปลอดภัย

## 3. การตรวจสอบความเพียงพอของ Bandwidth และ Throughput

### 3.1 การวิเคราะห์ ISP Bandwidth (ถ้ามี ISP)
- **บังคับวิเคราะห์**: ต้องระบุค่า Bandwidth จาก ISP
- คำนวณว่า Bandwidth จาก ISP เพียงพอต่อผู้ใช้ทั้งหมดหรือไม่
- เปรียบเทียบ ISP Bandwidth กับความต้องการรวมของ End User

### 3.2 การวิเคราะห์ Throughput ของอุปกรณ์
- **บังคับวิเคราะห์**: ต้องระบุค่า Max Throughput ของทุกอุปกรณ์ที่มีข้อมูล
- ตรวจสอบว่า Throughput ของ Edge Device รองรับ ISP Bandwidth เต็มที่หรือไม่
- ประเมิน Throughput ของ Core/Distribution Switch ว่าเพียงพอหรือไม่
- ระบุอุปกรณ์ที่ Throughput ไม่เพียงพอต่อ Traffic ที่ต้องรับ

### 3.3 การวิเคราะห์ Bandwidth ของสายเชื่อมต่อ
- **บังคับวิเคราะห์**: ต้องระบุค่า Bandwidth ของทุกเส้นทางที่มีข้อมูล
- ตรวจสอบความสมดุลของ Bandwidth ในแต่ละ Layer
- ระบุเส้นทางที่ Bandwidth ต่ำเกินไป (Underprovisioned)
- ระบุเส้นทางที่ Bandwidth สูงเกินไป (Overprovisioned)

### 3.4 การประเมินความเพียงพอตามจำนวนผู้ใช้
- **บังคับวิเคราะห์**: ต้องระบุจำนวน User Capacity ของทุก PC ที่มีข้อมูล
- คำนวณ Bandwidth ต่อ User (เฉลี่ย)
- ประเมินว่า Bandwidth ต่อคนเพียงพอต่อการใช้งานทั่วไปหรือไม่
- แนะนำค่า Bandwidth ที่เหมาะสมตามจำนวนผู้ใช้

### 3.5 สรุปปัญหา Bandwidth/Throughput
- สรุปจุดที่ Bandwidth/Throughput ไม่เพียงพอ
- ให้คำแนะนำการแก้ไข (อัพเกรด, เพิ่มสาย, เปลี่ยนอุปกรณ์)

## 4. คำแนะนำการปรับปรุงแผนผัง

### 4.1 การเพิ่ม Firewall และอุปกรณ์รักษาความปลอดภัย
- **ถ้ายังไม่มี Firewall**: แนะนำให้เพิ่มและระบุตำแหน่งที่เหมาะสม (หลัง ISP หรือหน้า Core)
- **ถ้ามี Firewall แล้ว**: ประเมินว่าอยู่ในตำแหน่งที่ถูกต้องหรือไม่
- แนะนำการเพิ่มอุปกรณ์เสริม (IDS/IPS, UTM, WAF) พร้อมตำแหน่งที่เหมาะสม
- เสนอการสร้าง DMZ สำหรับ Server ที่ต้องเปิดให้ภายนอกเข้าถึง

### 4.2 การปรับโครงสร้างให้เหมาะสมยิ่งขึ้น
- **Layer Adjustment**: แนะนำการปรับโครงสร้าง Layer ให้ชัดเจนขึ้น
- **Connection Restructure**: แนะนำการเปลี่ยนเส้นทางการเชื่อมต่อให้ถูกต้อง
- **Device Upgrade**: แนะนำอุปกรณ์ที่ควรอัพเกรด
- **Device Addition**: แนะนำอุปกรณ์ที่ควรเพิ่มเติม

### 4.3 การเพิ่ม Redundancy และ High Availability
- แนะนำการเพิ่ม Redundant Path สำหรับ Critical Link
- เสนอ Dual ISP หรือ Backup Internet Connection
- แนะนำการใช้ Link Aggregation หรือ Port Channeling
- เสนอ Backup Device สำหรับอุปกรณ์สำคัญ

### 4.4 การขยายเครือข่ายในอนาคต
- แนะนำวิธีการขยายเครือข่ายเมื่อมี User เพิ่มขึ้น
- เสนอการเตรียม Scalability
- แนะนำการอัพเกรดที่ควรทำในระยะยาว

### 4.5 สรุปลำดับความสำคัญของการปรับปรุง
- จัดลำดับความสำคัญ (Critical → High → Medium → Low)
- ให้เหตุผลว่าทำไมถึงจัดลำดับแบบนั้น

## 5. ภาพรวมและสรุป

### 5.1 สรุปจุดแข็ง
- ระบุสิ่งที่ออกแบบดีแล้ว
- ชมเชยจุดที่ถูกต้องตามหลักการ

### 5.2 สรุปจุดอ่อน
- สรุปปัญหาหลักที่พบทั้งหมด
- ย้ำจุดที่ต้องแก้ไขเร่งด่วน

### 5.3 คะแนนความเหมาะสม
- ให้คะแนนความเหมาะสมของแผนผัง (1-10 คะแนน)
- อธิบายเกณฑ์การให้คะแนน

### 5.4 แผนการปรับปรุงโดยสรุป
- สรุปการปรับปรุงที่ต้องทำ (3-5 ข้อหลัก)
- จัดลำดับตามความสำคัญและความเร่งด่วน

**หมายเหตุสำคัญ:**
- ห้ามวิเคราะห์ในเชิง Logical (IP Address, Routing, VLAN, Protocol, Subnet)
- เน้นที่โครงสร้างทางกายภาพ (Physical Topology) และการไหลของข้อมูลเท่านั้น
- ต้องวิเคราะห์ข้อมูลทุกค่าที่มีอยู่ (Bandwidth, Throughput, User Capacity) ห้ามข้าม"""

        response = await self.ollama_service.generate_response(prompt, context)
        return response

# Global instance
analyzer = NetworkTopologyAnalyzer()