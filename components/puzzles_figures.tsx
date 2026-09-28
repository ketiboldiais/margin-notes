import { Img } from "./Img";
import linked_list_example_1 from "../app/media/images/linked_list_example_1.svg";
import linked_list_example_1_result from "../app/media/images/linked_list_example_1_result.svg";


export const LINKED_LIST_EXAMPLE_1 = () => (
    <Img url={linked_list_example_1} width={170} alt="Two linked lists."/>
)

export const LINKED_LIST_EXAMPLE_1_RESULT = () => (
    <Img url={linked_list_example_1_result} width={170} alt="One linked list with the result."/>
)