import single_element_set from "../app/media/images/single_element_set.svg";
import subset_demo from "../app/media/images/subset_demo.svg";
import unit_circle from "../app/media/images/unit_circle.svg";
import one_to_one_function from "../app/media/images/one_to_one_function.svg";
import many_to_one_function from "../app/media/images/many_to_one_function.svg";
import onto_function from "../app/media/images/onto_function.svg";
import real_line from "../app/media/images/real_number_line.svg";
import { Img } from "./Img";

export const SINGLE_ELEMENT_SET = () => (
    <Img url={single_element_set} width={40} alt="A circle in a square to represent a single-element set."/>
)

export const SUBSET_DEMO = () => (
    <Img url={subset_demo} width={60} alt="A blob inside another blob, demonstrating A is a subset of B."/>
)

export const UNIT_CIRCLE = () => (
    <Img url={unit_circle} width={200} alt="The unit circle."/>
)

export const ONE_TO_ONE_FUNCTION = () => (
    <Img url={one_to_one_function} width={200} alt="A one-to-one function." caption="A one-to-one function."/>
)


export const MANY_TO_ONE_FUNCTION = () => (
    <Img url={many_to_one_function} width={180} alt="A many-to-one function." caption="A many-to-one function."/>
)


export const ONTO_FUNCTION = () => (
    <Img url={onto_function} width={150} alt="An onto function." caption="An onto function."/>
)


export const REAL_LINE = () => (
    <Img url={real_line} width={400} alt="The real number line."/>
)



